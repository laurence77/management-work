-- Crypto Wallets Table
CREATE TABLE IF NOT EXISTS crypto_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(20) NOT NULL UNIQUE,
    address TEXT NOT NULL UNIQUE,
    network VARCHAR(100) NOT NULL,
    icon VARCHAR(10) DEFAULT '',
    qr_code_path TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Crypto Transactions Table
CREATE TABLE IF NOT EXISTS crypto_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_hash TEXT NOT NULL UNIQUE,
    crypto_type VARCHAR(20) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    usd_amount DECIMAL(10, 2) NOT NULL,
    wallet_address TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    customer_email VARCHAR(255),
    customer_id UUID REFERENCES auth.users(id),
    booking_id UUID, -- Reference to booking if applicable
    qr_proof_path TEXT,
    rejected_reason TEXT,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crypto Exchange Rates Table (for USD conversion)
CREATE TABLE IF NOT EXISTS crypto_exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL,
    usd_rate DECIMAL(20, 8) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source VARCHAR(50) DEFAULT 'manual'
);

-- Insert default crypto wallets
INSERT INTO crypto_wallets (name, symbol, address, network, icon, is_active) VALUES
('Bitcoin', 'BTC', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'Bitcoin Mainnet', '₿', true),
('Ethereum', 'ETH', '0x742d35Cc6634C0532925a3b8D8432F7b8434331', 'Ethereum Mainnet', 'Ξ', true),
('USDT', 'USDT', '0x742d35Cc6634C0532925a3b8D8432F7b8434331', 'Ethereum (ERC-20)', '₮', true),
('USDC', 'USDC', '0x742d35Cc6634C0532925a3b8D8432F7b8434331', 'Ethereum (ERC-20)', '$', true),
('Binance Coin', 'BNB', 'bnb1xy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'Binance Smart Chain', '⬢', true),
('Litecoin', 'LTC', 'ltc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'Litecoin Mainnet', 'Ł', true)
ON CONFLICT (symbol) DO NOTHING;

-- Insert default exchange rates (these should be updated regularly)
INSERT INTO crypto_exchange_rates (symbol, usd_rate) VALUES
('BTC', 45000.00),
('ETH', 2500.00),
('USDT', 1.00),
('USDC', 1.00),
('BNB', 300.00),
('LTC', 70.00)
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_status ON crypto_transactions(status);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_customer ON crypto_transactions(customer_email);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_created ON crypto_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_crypto_wallets_active ON crypto_wallets(is_active);

-- Enable Row Level Security
ALTER TABLE crypto_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_exchange_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crypto_wallets
CREATE POLICY "Anyone can view active crypto wallets" ON crypto_wallets
    FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can manage crypto wallets" ON crypto_wallets
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for crypto_transactions
CREATE POLICY "Users can view their own transactions" ON crypto_transactions
    FOR SELECT USING (
        customer_email = auth.jwt() ->> 'email' 
        OR customer_id = auth.uid()
        OR auth.jwt() ->> 'role' = 'admin'
    );

CREATE POLICY "Users can insert their own transactions" ON crypto_transactions
    FOR INSERT WITH CHECK (
        customer_email = auth.jwt() ->> 'email' 
        OR customer_id = auth.uid()
    );

CREATE POLICY "Only admins can update transactions" ON crypto_transactions
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for crypto_exchange_rates
CREATE POLICY "Anyone can view exchange rates" ON crypto_exchange_rates
    FOR SELECT TO PUBLIC USING (true);

CREATE POLICY "Only admins can manage exchange rates" ON crypto_exchange_rates
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Create functions for automatic updates
CREATE OR REPLACE FUNCTION update_crypto_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_crypto_wallets_updated_at
    BEFORE UPDATE ON crypto_wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_crypto_updated_at();

CREATE TRIGGER update_crypto_transactions_updated_at
    BEFORE UPDATE ON crypto_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_crypto_updated_at();

-- Create notification functions
CREATE OR REPLACE FUNCTION notify_crypto_transaction_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status != NEW.status THEN
        -- Send notification about status change
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            created_at
        ) VALUES (
            NEW.customer_id,
            'Crypto Payment Update',
            CASE 
                WHEN NEW.status = 'verified' THEN 'Your crypto payment has been verified and confirmed!'
                WHEN NEW.status = 'rejected' THEN 'Your crypto payment was rejected. Please contact support.'
                ELSE 'Your crypto payment status has been updated.'
            END,
            'payment',
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER crypto_transaction_status_notification
    AFTER UPDATE ON crypto_transactions
    FOR EACH ROW
    EXECUTE FUNCTION notify_crypto_transaction_status_change();

-- Crypto Payment Intents Table (replaces Stripe payment intents)
CREATE TABLE IF NOT EXISTS crypto_payment_intents (
    id TEXT PRIMARY KEY,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'usd',
    crypto_type VARCHAR(20) NOT NULL,
    wallet_address TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'requires_payment' CHECK (status IN ('requires_payment', 'requires_confirmation', 'succeeded', 'canceled')),
    metadata JSONB,
    transaction_id UUID REFERENCES crypto_transactions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crypto Refund Requests Table
CREATE TABLE IF NOT EXISTS crypto_refund_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES crypto_transactions(id),
    requested_by UUID REFERENCES auth.users(id),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'processed')),
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    refund_transaction_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_crypto_payment_intents_status ON crypto_payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_crypto_refund_requests_status ON crypto_refund_requests(status);

-- Enable Row Level Security for new tables
ALTER TABLE crypto_payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_refund_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crypto_payment_intents
CREATE POLICY "Users can view their own payment intents" ON crypto_payment_intents
    FOR SELECT USING (
        (metadata->>'userId')::text = auth.uid()::text
        OR auth.jwt() ->> 'role' = 'admin'
    );

CREATE POLICY "Users can create their own payment intents" ON crypto_payment_intents
    FOR INSERT WITH CHECK (
        (metadata->>'userId')::text = auth.uid()::text
    );

CREATE POLICY "Only admins can update payment intents" ON crypto_payment_intents
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for crypto_refund_requests
CREATE POLICY "Users can view their own refund requests" ON crypto_refund_requests
    FOR SELECT USING (
        requested_by = auth.uid()
        OR auth.jwt() ->> 'role' = 'admin'
    );

CREATE POLICY "Users can create their own refund requests" ON crypto_refund_requests
    FOR INSERT WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Only admins can update refund requests" ON crypto_refund_requests
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

-- Add triggers for updated_at
CREATE TRIGGER update_crypto_payment_intents_updated_at
    BEFORE UPDATE ON crypto_payment_intents
    FOR EACH ROW
    EXECUTE FUNCTION update_crypto_updated_at();

CREATE TRIGGER update_crypto_refund_requests_updated_at
    BEFORE UPDATE ON crypto_refund_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_crypto_updated_at();