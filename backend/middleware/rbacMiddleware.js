const { supabase } = require('../config/supabase');
const { logger } = require('../utils/logger');

class RBACMiddleware {
  // Check if user has specific permission
  static requirePermission(permission) {
    return async (req, res, next) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        // Super admin bypass
        if (user.role === 'super_admin') {
          return next();
        }

        // Check permission using the database function
        const { data: hasPermission, error } = await supabase
          .rpc('check_user_permission', {
            user_auth_id: user.auth_id,
            permission_name: permission
          });

        if (error) {
          logger.error('Permission check error:', error);
          return res.status(500).json({
            success: false,
            error: 'Permission check failed'
          });
        }

        if (!hasPermission) {
          // Log unauthorized access attempt
          await this.logAuditEvent(user.id, 'ACCESS_DENIED', 'permission', null, {
            permission: permission,
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });

          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions'
          });
        }

        next();
      } catch (error) {
        logger.error('RBAC middleware error:', error);
        res.status(500).json({
          success: false,
          error: 'Authorization check failed'
        });
      }
    };
  }

  // Check if user belongs to specific organization
  static requireOrganization(allowSuperAdmin = true) {
    return async (req, res, next) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        // Super admin bypass
        if (allowSuperAdmin && user.role === 'super_admin') {
          return next();
        }

        // Get user's organization
        const { data: userOrgId, error } = await supabase
          .rpc('get_user_organization', {
            user_auth_id: user.auth_id
          });

        if (error) {
          logger.error('Organization check error:', error);
          return res.status(500).json({
            success: false,
            error: 'Organization check failed'
          });
        }

        if (!userOrgId) {
          return res.status(403).json({
            success: false,
            error: 'No organization access'
          });
        }

        // Add organization to request for use in controllers
        req.userOrganization = userOrgId;
        next();
      } catch (error) {
        logger.error('Organization middleware error:', error);
        res.status(500).json({
          success: false,
          error: 'Organization check failed'
        });
      }
    };
  }

  // Check multiple permissions (user needs at least one)
  static requireAnyPermission(permissions) {
    return async (req, res, next) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        // Super admin bypass
        if (user.role === 'super_admin') {
          return next();
        }

        // Check each permission
        for (const permission of permissions) {
          const { data: hasPermission, error } = await supabase
            .rpc('check_user_permission', {
              user_auth_id: user.auth_id,
              permission_name: permission
            });

          if (!error && hasPermission) {
            return next();
          }
        }

        // Log unauthorized access attempt
        await this.logAuditEvent(user.id, 'ACCESS_DENIED', 'permissions', null, {
          permissions: permissions,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      } catch (error) {
        logger.error('RBAC any permission middleware error:', error);
        res.status(500).json({
          success: false,
          error: 'Authorization check failed'
        });
      }
    };
  }

  // Check all permissions (user needs all of them)
  static requireAllPermissions(permissions) {
    return async (req, res, next) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        // Super admin bypass
        if (user.role === 'super_admin') {
          return next();
        }

        // Check all permissions
        for (const permission of permissions) {
          const { data: hasPermission, error } = await supabase
            .rpc('check_user_permission', {
              user_auth_id: user.auth_id,
              permission_name: permission
            });

          if (error || !hasPermission) {
            // Log unauthorized access attempt
            await this.logAuditEvent(user.id, 'ACCESS_DENIED', 'permissions', null, {
              permissions: permissions,
              failedPermission: permission,
              ip: req.ip,
              userAgent: req.get('User-Agent')
            });

            return res.status(403).json({
              success: false,
              error: 'Insufficient permissions'
            });
          }
        }

        next();
      } catch (error) {
        logger.error('RBAC all permissions middleware error:', error);
        res.status(500).json({
          success: false,
          error: 'Authorization check failed'
        });
      }
    };
  }

  // Resource ownership check
  static requireResourceOwnership(resourceType, resourceIdParam = 'id') {
    return async (req, res, next) => {
      try {
        const user = req.user;
        const resourceId = req.params[resourceIdParam];

        if (!user || !resourceId) {
          return res.status(401).json({
            success: false,
            error: 'Authentication and resource ID required'
          });
        }

        // Super admin bypass
        if (user.role === 'super_admin') {
          return next();
        }

        // Check resource ownership based on type
        let ownershipQuery;
        switch (resourceType) {
          case 'bookings':
            ownershipQuery = supabase
              .from('bookings')
              .select('created_by, organization_id')
              .eq('id', resourceId)
              .single();
            break;
          case 'celebrities':
            ownershipQuery = supabase
              .from('celebrities')
              .select('created_by, organization_id')
              .eq('id', resourceId)
              .single();
            break;
          case 'events':
            ownershipQuery = supabase
              .from('events')
              .select('created_by, organization_id')
              .eq('id', resourceId)
              .single();
            break;
          default:
            return res.status(400).json({
              success: false,
              error: 'Unknown resource type'
            });
        }

        const { data: resource, error } = await ownershipQuery;

        if (error || !resource) {
          return res.status(404).json({
            success: false,
            error: 'Resource not found'
          });
        }

        // Check if user owns the resource or belongs to same organization
        const isOwner = resource.created_by === user.id;
        const sameOrganization = resource.organization_id === user.organization_id;

        if (!isOwner && !sameOrganization) {
          // Log unauthorized access attempt
          await this.logAuditEvent(user.id, 'ACCESS_DENIED', resourceType, resourceId, {
            reason: 'not_owner_or_same_org',
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });

          return res.status(403).json({
            success: false,
            error: 'Access denied to this resource'
          });
        }

        next();
      } catch (error) {
        logger.error('Resource ownership middleware error:', error);
        res.status(500).json({
          success: false,
          error: 'Ownership check failed'
        });
      }
    };
  }

  // Audit logging helper
  static async logAuditEvent(userId, action, resourceType, resourceId, metadata = {}) {
    try {
      await supabase.rpc('log_audit_event', {
        p_user_id: userId,
        p_action: action,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_new_values: metadata
      });
    } catch (error) {
      logger.error('Audit logging error:', error);
    }
  }

  // Get user permissions for frontend
  static async getUserPermissions(req, res) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Super admin gets all permissions
      if (user.role === 'super_admin') {
        const { data: allPermissions } = await supabase
          .from('permissions')
          .select('name, resource, action, description');

        return res.json({
          success: true,
          data: {
            permissions: allPermissions.map(p => p.name),
            roles: ['super_admin'],
            isSuperAdmin: true
          }
        });
      }

      // Get user's roles and permissions
      const { data: userRolesAndPermissions, error } = await supabase
        .from('user_role_assignments')
        .select(`
          user_roles(name, display_name),
          user_roles!inner(
            role_permissions(
              permissions(name, resource, action, description)
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        logger.error('Get user permissions error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to get permissions'
        });
      }

      // Extract permissions and roles
      const permissions = new Set();
      const roles = new Set();

      userRolesAndPermissions.forEach(assignment => {
        roles.add(assignment.user_roles.name);
        assignment.user_roles.role_permissions.forEach(rp => {
          permissions.add(rp.permissions.name);
        });
      });

      res.json({
        success: true,
        data: {
          permissions: Array.from(permissions),
          roles: Array.from(roles),
          isSuperAdmin: false
        }
      });
    } catch (error) {
      logger.error('Get user permissions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get permissions'
      });
    }
  }
}

module.exports = RBACMiddleware;