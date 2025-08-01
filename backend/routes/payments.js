const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { supabase } = require('../config/supabase');

const router = express.Router();

// Create crypto payment intent for booking deposit
router.post('/crypto/create-intent', authenticateToken, async (req, res) => {
  try {
    const { amount, booking, cryptoType } = req.body;

    if (!amount || amount < 1) { // Minimum $1
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid payment amount' 
      });
    }

    if (!cryptoType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Crypto type is required' 
      });
    }

    // Get crypto wallet for the selected type
    const { data: wallet, error } = await supabase
      .from('crypto_wallets')
      .select('*')
      .eq('symbol', cryptoType.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !wallet) {
      return res.status(400).json({
        success: false,
        message: 'Crypto wallet not available'
      });
    }

    // Create payment intent record
    const paymentIntent = {
      id: `crypto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: amount,
      currency: 'usd',
      crypto_type: cryptoType.toUpperCase(),
      wallet_address: wallet.address,
      status: 'requires_payment',
      metadata: {
        userId: req.user.id,
        celebrityId: booking.celebrityId?.toString(),
        celebrityName: booking.celebrityName,
        eventType: booking.eventType,
        eventDate: booking.eventDate,
        bookingType: 'deposit'
      },
      created_at: new Date().toISOString()
    };

    // Store payment intent in database
    const { data: storedIntent, error: storeError } = await supabase
      .from('crypto_payment_intents')
      .insert([paymentIntent])
      .select()
      .single();

    if (storeError) {
      console.error('Error storing payment intent:', storeError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create payment intent'
      });
    }

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.id,
        wallet: {
          address: wallet.address,
          network: wallet.network,
          qrCode: wallet.qr_code_path ? `/api/crypto/qr/${wallet.id}` : null
        },
        amount: amount,
        cryptoType: cryptoType.toUpperCase()
      }
    });

  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get payment intent status
router.get('/crypto/intent/:intentId', authenticateToken, async (req, res) => {
  try {
    const { intentId } = req.params;

    const { data: intent, error } = await supabase
      .from('crypto_payment_intents')
      .select('*')
      .eq('id', intentId)
      .single();

    if (error || !intent) {
      return res.status(404).json({
        success: false,
        message: 'Payment intent not found'
      });
    }

    res.json({
      success: true,
      data: intent
    });

  } catch (error) {
    console.error('Error fetching payment intent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment intent'
    });
  }
});

// Legacy Stripe webhook (now handles crypto confirmations)
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  try {
    // This would handle crypto payment confirmations from external services
    // For now, we'll handle manual confirmations through the admin panel
    
    console.log('Payment webhook received (crypto payments handled via admin panel)');
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// Confirm crypto payment (called after transaction submission)
router.post('/crypto/confirm', authenticateToken, async (req, res) => {
  try {
    const { paymentIntentId, transactionHash, cryptoType, amount } = req.body;

    if (!paymentIntentId || !transactionHash) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID and transaction hash are required'
      });
    }

    // Get payment intent
    const { data: intent, error: intentError } = await supabase
      .from('crypto_payment_intents')
      .select('*')
      .eq('id', paymentIntentId)
      .single();

    if (intentError || !intent) {
      return res.status(404).json({
        success: false,
        message: 'Payment intent not found'
      });
    }

    // Create crypto transaction record
    const transactionData = {
      transaction_hash: transactionHash,
      crypto_type: cryptoType.toLowerCase(),
      amount: parseFloat(amount),
      usd_amount: intent.amount,
      wallet_address: intent.wallet_address,
      status: 'pending',
      customer_email: req.user?.email,
      customer_id: req.user?.id,
      payment_intent_id: paymentIntentId,
      created_at: new Date().toISOString()
    };

    const { data: transaction, error: txError } = await supabase
      .from('crypto_transactions')
      .insert([transactionData])
      .select()
      .single();

    if (txError) {
      console.error('Error creating transaction:', txError);
      return res.status(500).json({
        success: false,
        message: 'Failed to record transaction'
      });
    }

    // Update payment intent
    const { error: updateError } = await supabase
      .from('crypto_payment_intents')
      .update({ 
        status: 'requires_confirmation',
        transaction_id: transaction.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentIntentId);

    if (updateError) {
      console.error('Error updating payment intent:', updateError);
    }

    res.json({
      success: true,
      message: 'Payment submitted for verification',
      data: {
        transactionId: transaction.id,
        status: 'pending_verification'
      }
    });

  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment'
    });
  }
});

// Get available crypto payment methods
router.get('/crypto/methods', async (req, res) => {
  try {
    const { data: wallets, error } = await supabase
      .from('crypto_wallets')
      .select('id, name, symbol, network, icon')
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: wallets
    });

  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods'
    });
  }
});

// Process refund (crypto refunds handled manually)
router.post('/refund', authenticateToken, async (req, res) => {
  try {
    const { transactionId, reason } = req.body;

    // For crypto payments, refunds are processed manually
    // We'll create a refund request that admin can process
    
    const refundRequest = {
      transaction_id: transactionId,
      requested_by: req.user.id,
      reason: reason || 'Customer requested refund',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { data: refund, error } = await supabase
      .from('crypto_refund_requests')
      .insert([refundRequest])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Refund request submitted. Our team will process it manually.',
      data: refund
    });

  } catch (error) {
    console.error('Refund request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund request'
    });
  }
});

module.exports = router;