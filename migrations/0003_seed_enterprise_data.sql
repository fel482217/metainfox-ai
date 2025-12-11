-- Metainfox AI - Enterprise Seed Data
-- Migration 0003: System Roles, Permissions, Demo Organization

-- ============================================
-- 1. SYSTEM ROLES
-- ============================================
INSERT INTO roles (name, display_name, description, is_system_role) VALUES
  ('super_admin', 'Super Administrator', 'Full system access across all organizations', 1),
  ('org_admin', 'Organization Administrator', 'Full access within organization', 1),
  ('org_manager', 'Organization Manager', 'Manage risks, users, and settings', 1),
  ('org_member', 'Organization Member', 'Create and manage assigned risks', 1),
  ('org_viewer', 'Organization Viewer', 'Read-only access to risks and dashboards', 1);

-- ============================================
-- 2. PERMISSIONS
-- ============================================

-- Risk permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  ('risks.create', 'risks', 'create', 'Create new risks'),
  ('risks.read', 'risks', 'read', 'View risks'),
  ('risks.update', 'risks', 'update', 'Update risks'),
  ('risks.delete', 'risks', 'delete', 'Delete risks'),
  ('risks.manage', 'risks', 'manage', 'Full risk management'),
  ('risks.analyze', 'risks', 'analyze', 'Use AI analysis on risks');

-- Alert permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  ('alerts.create', 'alerts', 'create', 'Create alerts'),
  ('alerts.read', 'alerts', 'read', 'View alerts'),
  ('alerts.update', 'alerts', 'update', 'Update alerts'),
  ('alerts.delete', 'alerts', 'delete', 'Delete alerts');

-- User permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  ('users.invite', 'users', 'invite', 'Invite new users'),
  ('users.read', 'users', 'read', 'View user list'),
  ('users.update', 'users', 'update', 'Update user details'),
  ('users.delete', 'users', 'delete', 'Remove users'),
  ('users.manage', 'users', 'manage', 'Full user management');

-- Organization permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  ('organizations.create', 'organizations', 'create', 'Create organizations'),
  ('organizations.read', 'organizations', 'read', 'View organization details'),
  ('organizations.update', 'organizations', 'update', 'Update organization settings'),
  ('organizations.delete', 'organizations', 'delete', 'Delete organizations'),
  ('organizations.manage', 'organizations', 'manage', 'Full organization management');

-- Settings permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  ('settings.read', 'settings', 'read', 'View settings'),
  ('settings.update', 'settings', 'update', 'Update settings');

-- Analytics permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  ('analytics.read', 'analytics', 'read', 'View analytics and reports'),
  ('analytics.export', 'analytics', 'export', 'Export data');

-- Audit permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  ('audit.read', 'audit', 'read', 'View audit logs');

-- ============================================
-- 3. ROLE-PERMISSION MAPPINGS
-- ============================================

-- Super Admin: ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin';

-- Org Admin: All except super admin functions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'org_admin'
AND p.name NOT IN ('organizations.create', 'organizations.delete');

-- Org Manager: Risks, Alerts, Users (limited)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'org_manager'
AND p.name IN (
  'risks.create', 'risks.read', 'risks.update', 'risks.analyze',
  'alerts.read', 'alerts.create',
  'users.read', 'users.invite',
  'settings.read',
  'analytics.read'
);

-- Org Member: Basic risk management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'org_member'
AND p.name IN (
  'risks.create', 'risks.read', 'risks.update', 'risks.analyze',
  'alerts.read',
  'analytics.read'
);

-- Org Viewer: Read-only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'org_viewer'
AND p.name IN (
  'risks.read',
  'alerts.read',
  'analytics.read'
);

-- ============================================
-- 4. DEMO ORGANIZATION
-- ============================================
INSERT INTO organizations (
  name, slug, industry, size, country, timezone,
  plan_type, plan_status, max_users, max_risks
) VALUES (
  'Metainfox Demo', 'metainfox-demo', 'Technology', 'Medium', 'Mexico', 'America/Mexico_City',
  'professional', 'active', 50, 1000
);

-- ============================================
-- 5. DEMO USERS
-- ============================================
-- Password for all demo users: Demo123!@# (SHA256 hash with salt)
INSERT INTO users (email, password_hash, full_name, status, email_verified) VALUES
  ('admin@metainfox.io', '$sha256$fa6f95721c466781606901e1ad412f9febac2c143998a9918a94a5c602e2f2dd', 'Admin User', 'active', 1),
  ('manager@metainfox.io', '$sha256$fa6f95721c466781606901e1ad412f9febac2c143998a9918a94a5c602e2f2dd', 'Manager User', 'active', 1),
  ('member@metainfox.io', '$sha256$fa6f95721c466781606901e1ad412f9febac2c143998a9918a94a5c602e2f2dd', 'Member User', 'active', 1),
  ('viewer@metainfox.io', '$sha256$fa6f95721c466781606901e1ad412f9febac2c143998a9918a94a5c602e2f2dd', 'Viewer User', 'active', 1);

-- ============================================
-- 6. ASSIGN USERS TO DEMO ORGANIZATION
-- ============================================
INSERT INTO organization_members (organization_id, user_id, role, status, joined_at) VALUES
  (1, 1, 'org_admin', 'active', CURRENT_TIMESTAMP),
  (1, 2, 'org_manager', 'active', CURRENT_TIMESTAMP),
  (1, 3, 'org_member', 'active', CURRENT_TIMESTAMP),
  (1, 4, 'org_viewer', 'active', CURRENT_TIMESTAMP);

-- ============================================
-- 7. MIGRATE EXISTING RISKS TO DEMO ORGANIZATION
-- ============================================
UPDATE risks SET organization_id = 1, created_by = 1 WHERE organization_id IS NULL;
UPDATE alerts SET organization_id = 1 WHERE organization_id IS NULL;
UPDATE mitigation_actions SET organization_id = 1 WHERE organization_id IS NULL;
UPDATE metrics SET organization_id = 1 WHERE organization_id IS NULL;
