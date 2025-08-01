const authService = require('../services/authService');
const { logger, securityLogger } = require('../utils/logger');
const { errorHandler } = require('../utils/standard-error-handler');
const { 
  handlePasswordChange, 
  handleLogout 
} = require('../middleware/session-integration');

class AuthController {
  async register(req, res, next) {
    try {
      const { email, password, firstName, lastName, role, phone, company } = req.body;
      
      // Only admins can create admin users
      if (role === 'admin' && (!req.user || req.user.role !== 'admin')) {
        throw errorHandler.handleAuthorizationError('Only admins can create admin users');
      }

      const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
        phone,
        company,
        role: role || 'customer'
      });

      // Generate tokens for immediate login after registration
      const tokens = await authService.generateTokens(result.user);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.first_name,
          lastName: result.user.last_name,
          phone: result.user.phone,
          company: result.user.company,
          role: result.user.role
        },
        token: tokens.accessToken
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const deviceInfo = {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        deviceId: req.get('X-Device-ID')
      };

      const result = await authService.login(email, password, deviceInfo);

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.first_name,
          lastName: result.user.last_name,
          phone: result.user.phone,
          company: result.user.company,
          role: result.user.role,
          isVerified: result.user.is_verified
        },
        token: result.tokens.accessToken
      });
    } catch (error) {
      // Log security event for failed login
      securityLogger.warn('Login attempt failed', {
        email: req.body.email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        error: error.message
      });
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
      
      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token required'
        });
      }

      const deviceInfo = {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        deviceId: req.get('X-Device-ID')
      };

      const result = await authService.refreshTokens(refreshToken, deviceInfo);

      // Set new refresh token as httpOnly cookie
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.first_name,
            lastName: result.user.last_name,
            role: result.user.role,
            isVerified: result.user.is_verified
          },
          accessToken: result.tokens.accessToken,
          expiresIn: result.tokens.expiresIn
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
      const userId = req.user?.userId;
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');

      // Handle session security cleanup
      if (sessionToken) {
        await handleLogout(sessionToken, req);
      }

      await authService.logout(refreshToken, userId);

      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  }

  async verify(req, res, next) {
    try {
      // Token verification is handled by middleware
      // This endpoint just returns user info if token is valid
      res.json({
        success: true,
        message: 'Token is valid',
        data: {
          user: {
            id: req.user.userId,
            email: req.user.email,
            role: req.user.role,
            permissions: req.user.permissions
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const { data: userData, error } = await req.supabase
        .from('app_users')
        .select('*')
        .eq('id', req.user.userId)
        .single();

      if (error || !userData) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          user: {
            id: userData.id,
            email: userData.email,
            firstName: userData.first_name,
            lastName: userData.last_name,
            role: userData.role,
            phone: userData.phone,
            avatarUrl: userData.avatar_url,
            isVerified: userData.is_verified,
            lastLogin: userData.last_login,
            createdAt: userData.created_at
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const { firstName, lastName, phone, avatarUrl } = req.body;
      
      const { data: userData, error } = await req.supabase
        .from('app_users')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone,
          avatar_url: avatarUrl
        })
        .eq('id', req.user.userId)
        .select()
        .single();

      if (error) {
        throw new Error(`Update failed: ${error.message}`);
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: userData.id,
            email: userData.email,
            firstName: userData.first_name,
            lastName: userData.last_name,
            role: userData.role,
            phone: userData.phone,
            avatarUrl: userData.avatar_url,
            isVerified: userData.is_verified
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Validation
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters long'
        });
      }

      // Password strength validation
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
          success: false,
          message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({
          success: false,
          message: 'New password must be different from current password'
        });
      }

      // Get current user from Supabase
      const { data: user, error: fetchError } = await this.supabase.auth.admin.getUserById(userId);
      
      if (fetchError || !user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password by attempting to sign in
      const { data: signInData, error: signInError } = await this.supabase.auth.signInWithPassword({
        email: user.user.email,
        password: currentPassword
      });

      if (signInError) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password using Supabase Admin API
      const { data: updateData, error: updateError } = await this.supabase.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (updateError) {
        console.error('Password update error:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Failed to update password'
        });
      }

      // Handle session security for password change
      await handlePasswordChange(userId, req);

      // Log password change event
      await this.supabase
        .from('audit_logs')
        .insert([{
          user_id: userId,
          action: 'password_changed',
          details: { 
            timestamp: new Date().toISOString(),
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
          }
        }]);

      res.json({
        success: true,
        message: 'Password changed successfully. Please log in with your new password.'
      });

    } catch (error) {
      console.error('Change password error:', error);
      next(error);
    }
  }

  async revokeAllTokens(req, res, next) {
    try {
      await authService.logout(null, req.user.userId);

      res.json({
        success: true,
        message: 'All tokens revoked successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();