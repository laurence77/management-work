const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { logger, securityLogger, auditLogger } = require('../utils/logger');

class AuthService {
  constructor() {
    this.accessTokenExpiry = process.env.ACCESS_TOKEN_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY || '7d';
    this.jwtSecret = process.env.JWT_SECRET;
    this.refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
    
    // Security validation - ensure separate secrets are configured
    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    
    if (!this.refreshTokenSecret) {
      throw new Error('REFRESH_TOKEN_SECRET environment variable is required');
    }
    
    if (this.jwtSecret === this.refreshTokenSecret) {
      throw new Error('JWT_SECRET and REFRESH_TOKEN_SECRET must be different for security');
    }
  }

  // Register a new user
  async register(userData) {
    try {
      const { email, password, firstName, lastName, role = 'user' } = userData;

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role
        }
      });

      if (authError) {
        throw new Error(`Auth creation failed: ${authError.message}`);
      }

      // Create user in app_users table
      const { data: userData, error: userError } = await supabaseAdmin
        .from('app_users')
        .insert({
          auth_id: authData.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
          role,
          is_verified: true
        })
        .select()
        .single();

      if (userError) {
        // Cleanup auth user if app user creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new Error(`User creation failed: ${userError.message}`);
      }

      // Log registration
      auditLogger.info('User registered', {
        userId: userData.id,
        email,
        role,
        action: 'user_register'
      });

      return {
        user: userData,
        authUser: authData.user
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  // Login user
  async login(email, password, deviceInfo = {}) {
    try {
      // Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        securityLogger.warn('Failed login attempt', {
          email,
          error: authError.message,
          ip: deviceInfo.ip
        });
        throw new Error('Invalid credentials');
      }

      // Get user data from app_users
      const { data: userData, error: userError } = await supabaseAdmin
        .from('app_users')
        .select('*')
        .eq('auth_id', authData.user.id)
        .single();

      if (userError || !userData) {
        throw new Error('User not found');
      }

      // Check if user is active
      if (!userData.is_active) {
        throw new Error('Account is deactivated');
      }

      // Check if account is locked
      if (userData.locked_until && new Date(userData.locked_until) > new Date()) {
        throw new Error('Account is temporarily locked');
      }

      // Generate tokens
      const tokens = await this.generateTokens(userData, deviceInfo);

      // Update last login
      await supabaseAdmin
        .from('app_users')
        .update({
          last_login: new Date().toISOString(),
          login_attempts: 0,
          locked_until: null
        })
        .eq('id', userData.id);

      // Log successful login
      auditLogger.info('User logged in', {
        userId: userData.id,
        email: userData.email,
        action: 'user_login',
        ip: deviceInfo.ip
      });

      return {
        user: userData,
        tokens,
        supabaseSession: authData.session
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  // Generate access and refresh tokens
  async generateTokens(user, deviceInfo = {}) {
    try {
      // Get user permissions
      const { data: permissions } = await supabaseAdmin
        .rpc('get_user_permissions', { user_auth_id: user.auth_id });

      // Create access token payload
      const accessPayload = {
        userId: user.id,
        authId: user.auth_id,
        email: user.email,
        role: user.role,
        permissions: permissions?.map(p => p.permission_name) || []
      };

      // Generate access token
      const accessToken = jwt.sign(
        accessPayload,
        this.jwtSecret,
        { expiresIn: this.accessTokenExpiry }
      );

      // Generate refresh token
      const refreshTokenPayload = {
        userId: user.id,
        tokenType: 'refresh'
      };

      const refreshToken = jwt.sign(
        refreshTokenPayload,
        this.refreshTokenSecret,
        { expiresIn: this.refreshTokenExpiry }
      );

      // Hash refresh token for storage
      const refreshTokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      // Store refresh token in database
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      await supabaseAdmin
        .from('refresh_tokens')
        .insert({
          user_id: user.id,
          token_hash: refreshTokenHash,
          expires_at: expiresAt.toISOString(),
          device_info: deviceInfo,
          ip_address: deviceInfo.ip
        });

      return {
        accessToken,
        refreshToken,
        expiresIn: this.accessTokenExpiry
      };
    } catch (error) {
      logger.error('Token generation error:', error);
      throw error;
    }
  }

  // Refresh access token
  async refreshTokens(refreshToken, deviceInfo = {}) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.refreshTokenSecret);
      
      if (decoded.tokenType !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Hash the token to find in database
      const refreshTokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      // Find refresh token in database
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from('refresh_tokens')
        .select('*')
        .eq('token_hash', refreshTokenHash)
        .eq('is_revoked', false)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (tokenError || !tokenData) {
        throw new Error('Invalid or expired refresh token');
      }

      // Get user data
      const { data: userData, error: userError } = await supabaseAdmin
        .from('app_users')
        .select('*')
        .eq('id', tokenData.user_id)
        .single();

      if (userError || !userData || !userData.is_active) {
        throw new Error('User not found or inactive');
      }

      // Revoke old refresh token
      await supabaseAdmin
        .from('refresh_tokens')
        .update({ is_revoked: true })
        .eq('id', tokenData.id);

      // Generate new tokens
      const newTokens = await this.generateTokens(userData, deviceInfo);

      // Log token refresh
      auditLogger.info('Tokens refreshed', {
        userId: userData.id,
        action: 'token_refresh',
        ip: deviceInfo.ip
      });

      return {
        user: userData,
        tokens: newTokens
      };
    } catch (error) {
      securityLogger.warn('Token refresh failed', {
        error: error.message,
        ip: deviceInfo.ip
      });
      throw error;
    }
  }

  // Logout user
  async logout(refreshToken, userId) {
    try {
      if (refreshToken) {
        // Hash the token to find in database
        const refreshTokenHash = crypto
          .createHash('sha256')
          .update(refreshToken)
          .digest('hex');

        // Revoke refresh token
        await supabaseAdmin
          .from('refresh_tokens')
          .update({ is_revoked: true })
          .eq('token_hash', refreshTokenHash);
      }

      // Revoke all tokens for user if no specific token provided
      if (!refreshToken && userId) {
        await supabaseAdmin
          .from('refresh_tokens')
          .update({ is_revoked: true })
          .eq('user_id', userId);
      }

      // Log logout
      auditLogger.info('User logged out', {
        userId,
        action: 'user_logout'
      });

      return { success: true };
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }

  // Verify access token
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      
      // Get fresh user data
      const { data: userData, error: userError } = await supabaseAdmin
        .from('app_users')
        .select('*')
        .eq('id', decoded.userId)
        .single();

      if (userError || !userData || !userData.is_active) {
        throw new Error('User not found or inactive');
      }

      return {
        ...decoded,
        user: userData
      };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Check user permissions
  async hasPermission(userId, permission) {
    try {
      const { data: userData, error } = await supabaseAdmin
        .from('app_users')
        .select('auth_id')
        .eq('id', userId)
        .single();

      if (error || !userData) {
        return false;
      }

      const { data: hasPermission } = await supabaseAdmin
        .rpc('user_has_permission', {
          user_auth_id: userData.auth_id,
          permission_name: permission
        });

      return hasPermission;
    } catch (error) {
      logger.error('Permission check error:', error);
      return false;
    }
  }

  // Clean up expired tokens
  async cleanupExpiredTokens() {
    try {
      const { error } = await supabaseAdmin
        .from('refresh_tokens')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        logger.error('Token cleanup error:', error);
      } else {
        logger.info('Expired tokens cleaned up');
      }
    } catch (error) {
      logger.error('Token cleanup error:', error);
    }
  }
}

module.exports = new AuthService();