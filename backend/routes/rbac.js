const express = require('express');
const RBACMiddleware = require('../middleware/rbacMiddleware');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { supabase } = require('../config/supabase');
const { logger } = require('../utils/logger');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const assignRoleSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  roleId: Joi.string().uuid().required(),
  expiresAt: Joi.date().optional()
});

const createRoleSchema = Joi.object({
  name: Joi.string().required().min(1).max(50),
  displayName: Joi.string().required().min(1).max(100),
  description: Joi.string().optional().max(500),
  permissions: Joi.array().items(Joi.string().uuid()).optional()
});

const updateRoleSchema = Joi.object({
  displayName: Joi.string().optional().min(1).max(100),
  description: Joi.string().optional().max(500),
  permissions: Joi.array().items(Joi.string().uuid()).optional()
});

// Apply authentication to all RBAC routes
router.use(authenticateToken);

// Get current user's permissions and roles
router.get('/me/permissions', RBACMiddleware.getUserPermissions);

// Get all roles (requires user management permission)
router.get('/roles', 
  RBACMiddleware.requirePermission('users.read'),
  async (req, res) => {
    try {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select(`
          *,
          role_permissions(
            permissions(name, resource, action, description)
          )
        `)
        .order('name');

      if (error) throw error;

      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      logger.error('Get roles error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get roles'
      });
    }
  }
);

// Get all permissions
router.get('/permissions',
  RBACMiddleware.requirePermission('users.read'),
  async (req, res) => {
    try {
      const { data: permissions, error } = await supabase
        .from('permissions')
        .select('*')
        .order('resource, action');

      if (error) throw error;

      // Group permissions by resource
      const groupedPermissions = permissions.reduce((acc, permission) => {
        if (!acc[permission.resource]) {
          acc[permission.resource] = [];
        }
        acc[permission.resource].push(permission);
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          permissions,
          grouped: groupedPermissions
        }
      });
    } catch (error) {
      logger.error('Get permissions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get permissions'
      });
    }
  }
);

// Create new role (requires role management permission)
router.post('/roles',
  RBACMiddleware.requirePermission('users.assign_roles'),
  validate(createRoleSchema),
  async (req, res) => {
    try {
      const { name, displayName, description, permissions } = req.body;

      // Create role
      const { data: role, error: roleError } = await supabase
        .from('user_roles')
        .insert({
          name,
          display_name: displayName,
          description,
          is_system_role: false
        })
        .select()
        .single();

      if (roleError) throw roleError;

      // Assign permissions if provided
      if (permissions && permissions.length > 0) {
        const rolePermissions = permissions.map(permissionId => ({
          role_id: role.id,
          permission_id: permissionId
        }));

        const { error: permissionsError } = await supabase
          .from('role_permissions')
          .insert(rolePermissions);

        if (permissionsError) throw permissionsError;
      }

      // Log audit event
      await RBACMiddleware.logAuditEvent(
        req.user.id,
        'CREATE_ROLE',
        'role',
        role.id,
        { roleName: name, permissions }
      );

      res.status(201).json({
        success: true,
        data: role
      });
    } catch (error) {
      logger.error('Create role error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create role'
      });
    }
  }
);

// Update role (requires role management permission)
router.put('/roles/:roleId',
  RBACMiddleware.requirePermission('users.assign_roles'),
  validate(updateRoleSchema),
  async (req, res) => {
    try {
      const { roleId } = req.params;
      const { displayName, description, permissions } = req.body;

      // Check if role is system role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('is_system_role')
        .eq('id', roleId)
        .single();

      if (existingRole?.is_system_role) {
        return res.status(400).json({
          success: false,
          error: 'Cannot modify system roles'
        });
      }

      // Update role
      const { data: role, error: roleError } = await supabase
        .from('user_roles')
        .update({
          display_name: displayName,
          description
        })
        .eq('id', roleId)
        .select()
        .single();

      if (roleError) throw roleError;

      // Update permissions if provided
      if (permissions) {
        // Remove existing permissions
        await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', roleId);

        // Add new permissions
        if (permissions.length > 0) {
          const rolePermissions = permissions.map(permissionId => ({
            role_id: roleId,
            permission_id: permissionId
          }));

          const { error: permissionsError } = await supabase
            .from('role_permissions')
            .insert(rolePermissions);

          if (permissionsError) throw permissionsError;
        }
      }

      // Log audit event
      await RBACMiddleware.logAuditEvent(
        req.user.id,
        'UPDATE_ROLE',
        'role',
        roleId,
        { changes: req.body }
      );

      res.json({
        success: true,
        data: role
      });
    } catch (error) {
      logger.error('Update role error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update role'
      });
    }
  }
);

// Assign role to user
router.post('/users/:userId/roles',
  RBACMiddleware.requirePermission('users.assign_roles'),
  validate(assignRoleSchema),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { roleId, expiresAt } = req.body;

      // Check if user exists and belongs to same organization (unless super admin)
      if (req.user.role !== 'super_admin') {
        const { data: targetUser } = await supabase
          .from('app_users')
          .select('organization_id')
          .eq('id', userId)
          .single();

        if (!targetUser || targetUser.organization_id !== req.user.organization_id) {
          return res.status(403).json({
            success: false,
            error: 'Cannot assign roles to users outside your organization'
          });
        }
      }

      // Assign role
      const { data: assignment, error } = await supabase
        .from('user_role_assignments')
        .insert({
          user_id: userId,
          role_id: roleId,
          assigned_by: req.user.id,
          expires_at: expiresAt
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await RBACMiddleware.logAuditEvent(
        req.user.id,
        'ASSIGN_ROLE',
        'user_role',
        assignment.id,
        { userId, roleId, expiresAt }
      );

      res.status(201).json({
        success: true,
        data: assignment
      });
    } catch (error) {
      logger.error('Assign role error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assign role'
      });
    }
  }
);

// Remove role from user
router.delete('/users/:userId/roles/:roleId',
  RBACMiddleware.requirePermission('users.assign_roles'),
  async (req, res) => {
    try {
      const { userId, roleId } = req.params;

      // Check if user exists and belongs to same organization (unless super admin)
      if (req.user.role !== 'super_admin') {
        const { data: targetUser } = await supabase
          .from('app_users')
          .select('organization_id')
          .eq('id', userId)
          .single();

        if (!targetUser || targetUser.organization_id !== req.user.organization_id) {
          return res.status(403).json({
            success: false,
            error: 'Cannot modify roles for users outside your organization'
          });
        }
      }

      // Remove role assignment
      const { error } = await supabase
        .from('user_role_assignments')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('role_id', roleId);

      if (error) throw error;

      // Log audit event
      await RBACMiddleware.logAuditEvent(
        req.user.id,
        'REMOVE_ROLE',
        'user_role',
        null,
        { userId, roleId }
      );

      res.json({
        success: true,
        message: 'Role removed successfully'
      });
    } catch (error) {
      logger.error('Remove role error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove role'
      });
    }
  }
);

// Get user's roles and permissions
router.get('/users/:userId/roles',
  RBACMiddleware.requirePermission('users.read'),
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Check if user exists and belongs to same organization (unless super admin)
      if (req.user.role !== 'super_admin') {
        const { data: targetUser } = await supabase
          .from('app_users')
          .select('organization_id')
          .eq('id', userId)
          .single();

        if (!targetUser || targetUser.organization_id !== req.user.organization_id) {
          return res.status(403).json({
            success: false,
            error: 'Cannot view roles for users outside your organization'
          });
        }
      }

      const { data: assignments, error } = await supabase
        .from('user_role_assignments')
        .select(`
          *,
          user_roles(
            id, name, display_name, description,
            role_permissions(
              permissions(name, resource, action, description)
            )
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      res.json({
        success: true,
        data: assignments
      });
    } catch (error) {
      logger.error('Get user roles error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user roles'
      });
    }
  }
);

// Get audit logs (requires audit permission)
router.get('/audit',
  RBACMiddleware.requirePermission('system.audit'),
  async (req, res) => {
    try {
      const { limit = 50, offset = 0, action, resource_type } = req.query;

      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          app_users(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (action) {
        query = query.eq('action', action);
      }

      if (resource_type) {
        query = query.eq('resource_type', resource_type);
      }

      const { data: logs, error } = await query;

      if (error) throw error;

      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      logger.error('Get audit logs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get audit logs'
      });
    }
  }
);

module.exports = router;