const crypto = require('crypto');
const { logger } = require('./LoggingService');
const cacheService = require('./CacheService');
const { supabase } = require('../config/supabase');

/**
 * Comprehensive Payment Processing Service
 * Supports cryptocurrency payments and gift card redemption
 */

class PaymentService {
  constructor() {
    this.supportedCryptos = {
      BTC: {
        name: 'Bitcoin',
        decimals: 8,
        symbol: 'BTC',
        network: 'bitcoin',
        confirmations: 3
      },
      ETH: {
        name: 'Ethereum',
        decimals: 18,
        symbol: 'ETH',
        network: 'ethereum',
        confirmations: 12
      },
      USDT: {
        name: 'Tether USD',
        decimals: 6,
        symbol: 'USDT',
        network: 'ethereum',
        confirmations: 12
      },
      USDC: {
        name: 'USD Coin',
        decimals: 6,
        symbol: 'USDC',
        network: 'ethereum',
        confirmations: 12
      }
    };
    
    this.giftCardTypes = {
      PLATFORM: {
        name: 'Platform Gift Card',
        redeemable: true,
        transferable: true
      },
      PROMO: {
        name: 'Promotional Card',
        redeemable: true,
        transferable: false
      },
      LOYALTY: {
        name: 'Loyalty Reward',
        redeemable: true,
        transferable: false
      }
    };
    
    this.exchangeRates = new Map();
    this.setupExchangeRateUpdates();
    
    logger.info('💳 Payment service initialized with crypto and gift card support');
  }
  
  // =============================================================================
  // CRYPTOCURRENCY PAYMENT PROCESSING
  // =============================================================================
  
  async createCryptoPayment(bookingId, amount, currency, cryptoType, userId) {
    try {
      if (!this.supportedCryptos[cryptoType]) {
        throw new Error(`Unsupported cryptocurrency: ${cryptoType}`);
      }
      
      // Convert fiat to crypto amount
      const cryptoAmount = await this.convertToCrypto(amount, currency, cryptoType);
      
      // Generate unique payment address for this transaction
      const paymentAddress = await this.generatePaymentAddress(cryptoType);
      
      // Create payment record
      const paymentId = this.generatePaymentId();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      
      const payment = {
        id: paymentId,
        booking_id: bookingId,
        user_id: userId,
        payment_type: 'cryptocurrency',
        crypto_type: cryptoType,
        fiat_amount: amount,
        fiat_currency: currency,
        crypto_amount: cryptoAmount,
        payment_address: paymentAddress,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        confirmations_required: this.supportedCryptos[cryptoType].confirmations,
        confirmations_received: 0,
        created_at: new Date().toISOString()
      };
      
      // Save to database
      const { data, error } = await supabase
        .from('crypto_payments')
        .insert(payment)
        .select()
        .single();
      
      if (error) throw error;
      
      // Cache payment for quick lookup
      await cacheService.set(`crypto_payment:${paymentId}`, payment, 1800);
      await cacheService.set(`crypto_address:${paymentAddress}`, paymentId, 1800);
      
      // Start monitoring for payment
      this.monitorCryptoPayment(paymentId);
      
      logger.info('Crypto payment created', {
        paymentId,
        bookingId,
        cryptoType,
        amount: cryptoAmount,
        address: paymentAddress
      });
      
      return {
        success: true,
        payment: {
          paymentId,
          cryptoType,
          cryptoAmount,
          paymentAddress,
          expiresAt,
          qrCode: await this.generatePaymentQRCode(cryptoType, paymentAddress, cryptoAmount),
          instructions: this.getCryptoPaymentInstructions(cryptoType)
        }
      };
      
    } catch (error) {
      logger.error('Failed to create crypto payment', error, { bookingId, cryptoType });
      return { success: false, error: error.message };
    }
  }
  
  async generatePaymentAddress(cryptoType) {
    // In a real implementation, this would integrate with crypto wallet services
    // For demonstration, we'll generate a mock address
    const crypto = require('crypto');
    const random = crypto.randomBytes(20).toString('hex');
    
    switch (cryptoType) {
      case 'BTC':
        return `bc1q${random.substring(0, 39)}`;
      case 'ETH':
      case 'USDT':
      case 'USDC':
        return `0x${random.substring(0, 40)}`;
      default:
        throw new Error(`Address generation not implemented for ${cryptoType}`);
    }
  }
  
  async convertToCrypto(fiatAmount, fiatCurrency, cryptoType) {
    try {
      // Get current exchange rate
      const rate = await this.getExchangeRate(cryptoType, fiatCurrency);
      if (!rate) {
        throw new Error(`Exchange rate not available for ${cryptoType}/${fiatCurrency}`);
      }
      
      const cryptoAmount = fiatAmount / rate;
      const decimals = this.supportedCryptos[cryptoType].decimals;
      
      return parseFloat(cryptoAmount.toFixed(decimals));
    } catch (error) {
      logger.error('Failed to convert to crypto', error, { fiatAmount, fiatCurrency, cryptoType });
      throw error;
    }
  }
  
  async getExchangeRate(cryptoType, fiatCurrency) {
    try {
      const cacheKey = `exchange_rate:${cryptoType}_${fiatCurrency}`;
      let rate = await cacheService.get(cacheKey);
      
      if (!rate) {
        // In a real implementation, this would call external exchange rate APIs
        // For demonstration, using mock rates
        const mockRates = {
          'BTC_USD': 45000,
          'ETH_USD': 3000,
          'USDT_USD': 1,
          'USDC_USD': 1
        };
        
        rate = mockRates[`${cryptoType}_${fiatCurrency}`] || null;
        
        if (rate) {
          await cacheService.set(cacheKey, rate, 300); // Cache for 5 minutes
        }
      }
      
      return rate;
    } catch (error) {
      logger.error('Failed to get exchange rate', error, { cryptoType, fiatCurrency });
      return null;
    }
  }
  
  async generatePaymentQRCode(cryptoType, address, amount) {
    // Generate payment URI for QR code
    let uri;
    
    switch (cryptoType) {
      case 'BTC':
        uri = `bitcoin:${address}?amount=${amount}`;
        break;
      case 'ETH':
        uri = `ethereum:${address}?value=${amount}e18`;
        break;
      case 'USDT':
      case 'USDC':
        // ERC-20 token transfer
        uri = `ethereum:${address}?value=${amount}e6`;
        break;
      default:
        uri = `${cryptoType.toLowerCase()}:${address}?amount=${amount}`;
    }
    
    // In a real implementation, this would generate an actual QR code image
    // For now, return the URI that can be used to generate QR code on frontend
    return {
      uri,
      format: 'uri'
    };
  }
  
  getCryptoPaymentInstructions(cryptoType) {
    const crypto = this.supportedCryptos[cryptoType];
    
    return {
      title: `Pay with ${crypto.name}`,
      steps: [
        `Send exactly the specified amount of ${crypto.symbol} to the provided address`,
        `Wait for ${crypto.confirmations} network confirmations`,
        'Payment will be automatically verified and processed',
        'You will receive a confirmation email once payment is complete'
      ],
      warnings: [
        `Only send ${crypto.symbol} to this address`,
        'Sending wrong cryptocurrency will result in loss of funds',
        'Payment must be made within the time limit',
        'Network fees are not included in the amount'
      ]
    };
  }
  
  async monitorCryptoPayment(paymentId) {
    // In a real implementation, this would set up blockchain monitoring
    // For demonstration, we'll simulate payment detection after a delay
    setTimeout(async () => {
      try {
        await this.simulatePaymentDetection(paymentId);
      } catch (error) {
        logger.error('Payment monitoring failed', error, { paymentId });
      }
    }, 60000); // Simulate 1 minute delay
  }
  
  async simulatePaymentDetection(paymentId) {
    try {
      // Get payment details
      const { data: payment, error } = await supabase
        .from('crypto_payments')
        .select('*')
        .eq('id', paymentId)
        .single();
      
      if (error || !payment) {
        throw new Error(`Payment not found: ${paymentId}`);
      }
      
      if (payment.status !== 'pending') {
        return; // Payment already processed
      }
      
      // Simulate receiving confirmations
      const requiredConfirmations = payment.confirmations_required;
      
      for (let conf = 1; conf <= requiredConfirmations; conf++) {
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds between confirmations
        
        await supabase
          .from('crypto_payments')
          .update({ confirmations_received: conf })
          .eq('id', paymentId);
        
        logger.info('Payment confirmation received', {
          paymentId,
          confirmations: conf,
          required: requiredConfirmations
        });
        
        if (conf === requiredConfirmations) {
          await this.confirmCryptoPayment(paymentId);
        }
      }
    } catch (error) {
      logger.error('Payment simulation failed', error, { paymentId });
    }
  }
  
  async confirmCryptoPayment(paymentId) {
    try {
      // Update payment status
      const { data: payment, error } = await supabase
        .from('crypto_payments')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .select('*, bookings(*)')
        .single();
      
      if (error) throw error;
      
      // Update booking status
      await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          payment_status: 'paid',
          payment_method: 'cryptocurrency',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', payment.booking_id);
      
      // Clear cache
      await cacheService.del(`crypto_payment:${paymentId}`);
      
      // Send confirmation notifications
      // This would integrate with your notification system
      
      logger.info('Crypto payment confirmed', {
        paymentId,
        bookingId: payment.booking_id,
        amount: payment.crypto_amount,
        cryptoType: payment.crypto_type
      });
      
      return { success: true, payment };
      
    } catch (error) {
      logger.error('Failed to confirm crypto payment', error, { paymentId });
      throw error;
    }
  }
  
  async getCryptoPaymentStatus(paymentId) {
    try {
      const { data: payment, error } = await supabase
        .from('crypto_payments')
        .select('*')
        .eq('id', paymentId)
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        payment: {
          id: payment.id,
          status: payment.status,
          cryptoType: payment.crypto_type,
          cryptoAmount: payment.crypto_amount,
          paymentAddress: payment.payment_address,
          confirmations: payment.confirmations_received,
          requiredConfirmations: payment.confirmations_required,
          expiresAt: payment.expires_at,
          confirmedAt: payment.confirmed_at
        }
      };
    } catch (error) {
      logger.error('Failed to get crypto payment status', error, { paymentId });
      return { success: false, error: error.message };
    }
  }
  
  // =============================================================================
  // GIFT CARD PROCESSING
  // =============================================================================
  
  async createGiftCard(amount, currency, type = 'PLATFORM', issuedBy, recipientEmail = null) {
    try {
      const code = this.generateGiftCardCode();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year validity
      
      const giftCard = {
        code,
        amount,
        currency,
        original_amount: amount,
        type,
        issued_by: issuedBy,
        recipient_email: recipientEmail,
        is_active: true,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('gift_cards')
        .insert(giftCard)
        .select()
        .single();
      
      if (error) throw error;
      
      // Cache gift card for quick lookup
      await cacheService.set(`gift_card:${code}`, data, 3600);
      
      logger.info('Gift card created', {
        code,
        amount,
        currency,
        type,
        issuedBy
      });
      
      return {
        success: true,
        giftCard: {
          code,
          amount,
          currency,
          type: this.giftCardTypes[type].name,
          expiresAt
        }
      };
      
    } catch (error) {
      logger.error('Failed to create gift card', error);
      return { success: false, error: error.message };
    }
  }
  
  generateGiftCardCode() {
    // Generate a unique gift card code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    // Format: XXXX-XXXX-XXXX-XXXX
    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) {
        code += '-';
      }
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return code;
  }
  
  async validateGiftCard(code) {
    try {
      // Check cache first
      let giftCard = await cacheService.get(`gift_card:${code}`);
      
      if (!giftCard) {
        // Query database
        const { data, error } = await supabase
          .from('gift_cards')
          .select('*')
          .eq('code', code)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            return { success: false, error: 'Gift card not found' };
          }
          throw error;
        }
        
        giftCard = data;
        await cacheService.set(`gift_card:${code}`, giftCard, 3600);
      }
      
      // Validate gift card
      const now = new Date();
      const expiresAt = new Date(giftCard.expires_at);
      
      if (!giftCard.is_active) {
        return { success: false, error: 'Gift card has been deactivated' };
      }
      
      if (now > expiresAt) {
        return { success: false, error: 'Gift card has expired' };
      }
      
      if (giftCard.amount <= 0) {
        return { success: false, error: 'Gift card has no remaining balance' };
      }
      
      return {
        success: true,
        giftCard: {
          code: giftCard.code,
          amount: giftCard.amount,
          currency: giftCard.currency,
          originalAmount: giftCard.original_amount,
          type: giftCard.type,
          expiresAt: giftCard.expires_at,
          isTransferable: this.giftCardTypes[giftCard.type]?.transferable || false
        }
      };
      
    } catch (error) {
      logger.error('Failed to validate gift card', error, { code });
      return { success: false, error: 'Failed to validate gift card' };
    }
  }
  
  async redeemGiftCard(code, amount, bookingId, userId) {
    try {
      // Validate gift card first
      const validation = await this.validateGiftCard(code);
      if (!validation.success) {
        return validation;
      }
      
      const giftCard = validation.giftCard;
      
      // Check if redemption amount is valid
      if (amount > giftCard.amount) {
        return {
          success: false,
          error: `Insufficient gift card balance. Available: ${giftCard.amount} ${giftCard.currency}`
        };
      }
      
      // Calculate new balance
      const newBalance = giftCard.amount - amount;
      
      // Create redemption record
      const redemption = {
        gift_card_code: code,
        booking_id: bookingId,
        user_id: userId,
        amount_redeemed: amount,
        remaining_balance: newBalance,
        redeemed_at: new Date().toISOString()
      };
      
      // Start transaction
      const { data: redemptionData, error: redemptionError } = await supabase
        .from('gift_card_redemptions')
        .insert(redemption)
        .select()
        .single();
      
      if (redemptionError) throw redemptionError;
      
      // Update gift card balance
      const updateData = {
        amount: newBalance,
        last_used_at: new Date().toISOString()
      };
      
      // Deactivate if fully used
      if (newBalance <= 0) {
        updateData.is_active = false;
      }
      
      const { error: updateError } = await supabase
        .from('gift_cards')
        .update(updateData)
        .eq('code', code);
      
      if (updateError) throw updateError;
      
      // Update booking payment status
      if (newBalance <= 0 && giftCard.amount >= amount) {
        // Full payment with gift card
        await supabase
          .from('bookings')
          .update({
            payment_status: 'paid',
            payment_method: 'gift_card',
            confirmed_at: new Date().toISOString()
          })
          .eq('id', bookingId);
      } else {
        // Partial payment - create payment record
        await this.createPartialPaymentRecord(bookingId, amount, 'gift_card', code);
      }
      
      // Clear cache
      await cacheService.del(`gift_card:${code}`);
      
      logger.info('Gift card redeemed', {
        code,
        amountRedeemed: amount,
        remainingBalance: newBalance,
        bookingId,
        userId
      });
      
      return {
        success: true,
        redemption: {
          amountRedeemed: amount,
          remainingBalance: newBalance,
          fullyRedeemed: newBalance <= 0,
          redemptionId: redemptionData.id
        }
      };
      
    } catch (error) {
      logger.error('Failed to redeem gift card', error, { code, amount, bookingId });
      return { success: false, error: 'Failed to redeem gift card' };
    }
  }
  
  async transferGiftCard(code, fromUserId, toUserEmail) {
    try {
      // Validate gift card
      const validation = await this.validateGiftCard(code);
      if (!validation.success) {
        return validation;
      }
      
      const giftCard = validation.giftCard;
      
      // Check if gift card is transferable
      if (!giftCard.isTransferable) {
        return {
          success: false,
          error: 'This gift card type is not transferable'
        };
      }
      
      // Get current owner
      const { data: currentCard, error: fetchError } = await supabase
        .from('gift_cards')
        .select('*')
        .eq('code', code)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Check ownership (if assigned)
      if (currentCard.recipient_email && currentCard.recipient_email !== fromUserId) {
        return {
          success: false,
          error: 'You are not authorized to transfer this gift card'
        };
      }
      
      // Create transfer record
      const transfer = {
        gift_card_code: code,
        from_user_id: fromUserId,
        to_user_email: toUserEmail,
        transferred_at: new Date().toISOString()
      };
      
      const { error: transferError } = await supabase
        .from('gift_card_transfers')
        .insert(transfer);
      
      if (transferError) throw transferError;
      
      // Update gift card recipient
      const { error: updateError } = await supabase
        .from('gift_cards')
        .update({
          recipient_email: toUserEmail,
          updated_at: new Date().toISOString()
        })
        .eq('code', code);
      
      if (updateError) throw updateError;
      
      // Clear cache
      await cacheService.del(`gift_card:${code}`);
      
      logger.info('Gift card transferred', {
        code,
        fromUserId,
        toUserEmail
      });
      
      return {
        success: true,
        transfer: {
          code,
          newRecipient: toUserEmail,
          transferredAt: new Date()
        }
      };
      
    } catch (error) {
      logger.error('Failed to transfer gift card', error, { code });
      return { success: false, error: 'Failed to transfer gift card' };
    }
  }
  
  async getGiftCardHistory(code) {
    try {
      const { data: redemptions, error: redemptionError } = await supabase
        .from('gift_card_redemptions')
        .select('*')
        .eq('gift_card_code', code)
        .order('redeemed_at', { ascending: false });
      
      if (redemptionError) throw redemptionError;
      
      const { data: transfers, error: transferError } = await supabase
        .from('gift_card_transfers')
        .select('*')
        .eq('gift_card_code', code)
        .order('transferred_at', { ascending: false });
      
      if (transferError) throw transferError;
      
      return {
        success: true,
        history: {
          redemptions: redemptions || [],
          transfers: transfers || []
        }
      };
      
    } catch (error) {
      logger.error('Failed to get gift card history', error, { code });
      return { success: false, error: 'Failed to get gift card history' };
    }
  }
  
  // =============================================================================
  // UTILITY METHODS
  // =============================================================================
  
  generatePaymentId() {
    return `pay_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }
  
  async createPartialPaymentRecord(bookingId, amount, method, reference) {
    try {
      const { data, error } = await supabase
        .from('booking_payments')
        .insert({
          booking_id: bookingId,
          amount,
          payment_method: method,
          reference,
          status: 'completed',
          paid_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      logger.error('Failed to create partial payment record', error);
      throw error;
    }
  }
  
  setupExchangeRateUpdates() {
    // Update exchange rates every 5 minutes
    setInterval(async () => {
      try {
        await this.updateExchangeRates();
      } catch (error) {
        logger.error('Failed to update exchange rates', error);
      }
    }, 5 * 60 * 1000);
    
    // Initial update
    this.updateExchangeRates();
  }
  
  async updateExchangeRates() {
    try {
      // In a real implementation, this would call external APIs
      // For now, just log that we're updating rates
      logger.debug('Exchange rates updated');
    } catch (error) {
      logger.error('Exchange rate update failed', error);
    }
  }
  
  getSupportedPaymentMethods() {
    return {
      cryptocurrencies: Object.keys(this.supportedCryptos).map(key => ({
        code: key,
        ...this.supportedCryptos[key]
      })),
      giftCards: Object.keys(this.giftCardTypes).map(key => ({
        code: key,
        ...this.giftCardTypes[key]
      }))
    };
  }
  
  async getPaymentStats() {
    try {
      const { data: cryptoStats, error: cryptoError } = await supabase
        .from('crypto_payments')
        .select('status, crypto_type, fiat_amount')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      const { data: giftCardStats, error: giftCardError } = await supabase
        .from('gift_card_redemptions')
        .select('amount_redeemed')
        .gte('redeemed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      if (cryptoError) throw cryptoError;
      if (giftCardError) throw giftCardError;
      
      return {
        cryptocurrency: {
          totalPayments: cryptoStats.length,
          confirmedPayments: cryptoStats.filter(p => p.status === 'confirmed').length,
          totalVolume: cryptoStats.reduce((sum, p) => sum + (p.fiat_amount || 0), 0),
          byType: this.groupBy(cryptoStats, 'crypto_type')
        },
        giftCards: {
          totalRedemptions: giftCardStats.length,
          totalRedeemed: giftCardStats.reduce((sum, r) => sum + (r.amount_redeemed || 0), 0)
        }
      };
    } catch (error) {
      logger.error('Failed to get payment stats', error);
      return null;
    }
  }
  
  groupBy(array, key) {
    return array.reduce((result, item) => {
      const group = item[key];
      if (!result[group]) {
        result[group] = [];
      }
      result[group].push(item);
      return result;
    }, {});
  }
  
  async healthCheck() {
    try {
      // Check database connectivity
      const { data, error } = await supabase
        .from('crypto_payments')
        .select('id')
        .limit(1);
      
      if (error) throw error;
      
      return {
        status: 'healthy',
        features: {
          cryptocurrency: true,
          giftCards: true,
          exchangeRates: this.exchangeRates.size > 0
        },
        supportedCryptos: Object.keys(this.supportedCryptos),
        supportedGiftCardTypes: Object.keys(this.giftCardTypes),
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

module.exports = PaymentService;