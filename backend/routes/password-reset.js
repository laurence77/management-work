const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const supabase = require('../config/supabase');
const { logger } = require('../utils/logger');

const router = express.Router();

// Request password reset
router.post('/request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, you will receive a password reset link.'
      });
    }

    // Generate password reset token
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.FRONTEND_URL}/reset-password`
      }
    });

    if (error) {
      logger.error('Password reset link generation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate reset link'
      });
    }

    // In production, you would send this via email
    // For now, we'll log it (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('\n🔑 PASSWORD RESET LINK:');
      console.log(data.properties.action_link);
      console.log('\nCopy this link to reset your password\n');
    }

    // Here you would typically send an email with the reset link
    // await sendPasswordResetEmail(email, data.properties.action_link);

    logger.info('Password reset requested', { email });

    res.json({
      success: true,
      message: 'If an account with that email exists, you will receive a password reset link.',
      // In development, include the link for testing
      ...(process.env.NODE_ENV === 'development' && {
        resetLink: data.properties.action_link
      })
    });

  } catch (error) {
    logger.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reset password with token
router.post('/reset', async (req, res) => {
  try {
    const { access_token, refresh_token, new_password } = req.body;

    if (!access_token || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Access token and new password are required'
      });
    }

    // Verify the session
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.getUser(access_token);

    if (sessionError || !sessionData.user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update the password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      sessionData.user.id,
      { password: new_password }
    );

    if (updateError) {
      logger.error('Password update error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update password'
      });
    }

    logger.info('Password reset successful', { userId: sessionData.user.id });

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    logger.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Admin password reset (for admins to reset other users)
router.post('/admin-reset', authenticateToken, async (req, res) => {
  try {
    const { email, new_password } = req.body;

    // Check if requesting user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    if (!email || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Email and new password are required'
      });
    }

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('auth_id')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.auth_id,
      { password: new_password }
    );

    if (updateError) {
      logger.error('Admin password reset error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update password'
      });
    }

    logger.info('Admin password reset', { 
      adminId: req.user.userId, 
      targetEmail: email 
    });

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    logger.error('Admin password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;