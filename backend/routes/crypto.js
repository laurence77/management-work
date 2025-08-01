const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('../middleware/auth');
const { supabase } = require('../config/supabase');
const router = express.Router();

// Configure multer for QR code uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/crypto');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get all crypto wallets (public endpoint)
router.get('/wallets', async (req, res) => {
  try {
    const { data: wallets, error } = await supabase
      .from('crypto_wallets')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: wallets
    });
  } catch (error) {
    console.error('Error fetching crypto wallets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch crypto wallets'
    });
  }
});

// Get QR code for specific wallet
router.get('/qr/:walletId', async (req, res) => {
  try {
    const { walletId } = req.params;
    
    const { data: wallet, error } = await supabase
      .from('crypto_wallets')
      .select('qr_code_path')
      .eq('id', walletId)
      .eq('is_active', true)
      .single();

    if (error || !wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    if (wallet.qr_code_path) {
      const qrPath = path.join(__dirname, '../uploads/crypto', wallet.qr_code_path);
      res.sendFile(qrPath);
    } else {
      res.status(404).json({
        success: false,
        message: 'QR code not available'
      });
    }
  } catch (error) {
    console.error('Error serving QR code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load QR code'
    });
  }
});

// Submit crypto payment for verification
router.post('/payments/verify', upload.single('qrProof'), async (req, res) => {
  try {
    const { transactionHash, cryptoType, amount, walletAddress } = req.body;
    
    if (!transactionHash || !cryptoType || !amount || !walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment information'
      });
    }

    // Check if transaction already exists
    const { data: existingTx, error: checkError } = await supabase
      .from('crypto_transactions')
      .select('id')
      .eq('transaction_hash', transactionHash)
      .single();

    if (existingTx) {
      return res.status(400).json({
        success: false,
        message: 'Transaction already submitted'
      });
    }

    const transactionData = {
      transaction_hash: transactionHash,
      crypto_type: cryptoType.toLowerCase(),
      amount: parseFloat(amount),
      usd_amount: parseFloat(amount), // Will be calculated based on current rates
      wallet_address: walletAddress,
      status: 'pending',
      customer_email: req.user?.email || 'anonymous',
      qr_proof_path: req.file ? req.file.filename : null,
      created_at: new Date().toISOString()
    };

    const { data: transaction, error } = await supabase
      .from('crypto_transactions')
      .insert([transactionData])
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Payment submitted for verification',
      data: {
        transactionId: transaction.id,
        status: 'pending_verification'
      }
    });

  } catch (error) {
    console.error('Error submitting crypto payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit payment for verification'
    });
  }
});

// Get payment status
router.get('/payments/:transactionId/status', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    const { data: transaction, error } = await supabase
      .from('crypto_transactions')
      .select('id, status, verified_at, rejected_reason')
      .eq('id', transactionId)
      .single();

    if (error || !transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: {
        status: transaction.status,
        verifiedAt: transaction.verified_at,
        rejectedReason: transaction.rejected_reason
      }
    });

  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment status'
    });
  }
});

// ADMIN ENDPOINTS
// Add new crypto wallet (admin only)
router.post('/admin/wallets', authenticateToken, upload.single('qrCode'), async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user?.role || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { name, symbol, address, network, icon } = req.body;
    
    if (!name || !symbol || !address || !network || !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Missing required wallet information or QR code'
      });
    }

    const walletData = {
      name,
      symbol: symbol.toUpperCase(),
      address,
      network,
      icon: icon || symbol.charAt(0),
      qr_code_path: req.file.filename,
      is_active: true,
      created_at: new Date().toISOString(),
      created_by: req.user.id
    };

    const { data: wallet, error } = await supabase
      .from('crypto_wallets')
      .insert([walletData])
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Crypto wallet added successfully',
      data: wallet
    });

  } catch (error) {
    console.error('Error adding crypto wallet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add crypto wallet'
    });
  }
});

// Get all crypto wallets (admin)
router.get('/admin/wallets', authenticateToken, async (req, res) => {
  try {
    if (!req.user?.role || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { data: wallets, error } = await supabase
      .from('crypto_wallets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: wallets
    });
  } catch (error) {
    console.error('Error fetching admin wallets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallets'
    });
  }
});

// Get pending transactions (admin)
router.get('/admin/transactions', authenticateToken, async (req, res) => {
  try {
    if (!req.user?.role || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { status = 'pending' } = req.query;

    const { data: transactions, error } = await supabase
      .from('crypto_transactions')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
});

// Verify or reject transaction (admin)
router.patch('/admin/transactions/:transactionId', authenticateToken, async (req, res) => {
  try {
    if (!req.user?.role || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { transactionId } = req.params;
    const { status, rejectedReason } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const updateData = {
      status,
      verified_by: req.user.id,
      verified_at: new Date().toISOString()
    };

    if (status === 'rejected' && rejectedReason) {
      updateData.rejected_reason = rejectedReason;
    }

    const { data: transaction, error } = await supabase
      .from('crypto_transactions')
      .update(updateData)
      .eq('id', transactionId)
      .select()
      .single();

    if (error) throw error;

    // If verified, create booking or update payment status
    if (status === 'verified') {
      // Here you would update the associated booking/order status
      // For now, we'll just log it
      console.log(`Transaction ${transactionId} verified for ${transaction.usd_amount} USD`);
    }

    res.json({
      success: true,
      message: `Transaction ${status} successfully`,
      data: transaction
    });

  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction'
    });
  }
});

// Update wallet status (admin)
router.patch('/admin/wallets/:walletId', authenticateToken, async (req, res) => {
  try {
    if (!req.user?.role || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { walletId } = req.params;
    const { is_active } = req.body;

    const { data: wallet, error } = await supabase
      .from('crypto_wallets')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', walletId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Wallet updated successfully',
      data: wallet
    });

  } catch (error) {
    console.error('Error updating wallet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update wallet'
    });
  }
});

// Get transaction proof image
router.get('/admin/transactions/:transactionId/proof', authenticateToken, async (req, res) => {
  try {
    if (!req.user?.role || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { transactionId } = req.params;
    
    const { data: transaction, error } = await supabase
      .from('crypto_transactions')
      .select('qr_proof_path')
      .eq('id', transactionId)
      .single();

    if (error || !transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.qr_proof_path) {
      const proofPath = path.join(__dirname, '../uploads/crypto', transaction.qr_proof_path);
      res.sendFile(proofPath);
    } else {
      res.status(404).json({
        success: false,
        message: 'Proof image not available'
      });
    }
  } catch (error) {
    console.error('Error serving proof image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load proof image'
    });
  }
});

// Crypto statistics (admin)
router.get('/admin/stats', authenticateToken, async (req, res) => {
  try {
    if (!req.user?.role || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Get transaction counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('crypto_transactions')
      .select('status')
      .then(({ data, error }) => {
        if (error) return { data: null, error };
        
        const counts = data.reduce((acc, tx) => {
          acc[tx.status] = (acc[tx.status] || 0) + 1;
          return acc;
        }, {});
        
        return { data: counts, error: null };
      });

    // Get total verified amount
    const { data: totalAmount, error: amountError } = await supabase
      .from('crypto_transactions')
      .select('usd_amount')
      .eq('status', 'verified');

    const totalVerified = totalAmount?.reduce((sum, tx) => sum + tx.usd_amount, 0) || 0;

    // Get active wallets count
    const { count: activeWallets, error: walletsError } = await supabase
      .from('crypto_wallets')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (statusError || amountError || walletsError) {
      throw statusError || amountError || walletsError;
    }

    res.json({
      success: true,
      data: {
        transactionCounts: statusCounts || {},
        totalVerifiedAmount: totalVerified,
        activeWallets: activeWallets || 0,
        pendingTransactions: statusCounts?.pending || 0
      }
    });

  } catch (error) {
    console.error('Error fetching crypto stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

module.exports = router;