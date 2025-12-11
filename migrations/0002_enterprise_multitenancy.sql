-- Metainfox AI - Enterprise Multi-Tenancy Schema
-- Migration 0002: Organizations, Users, Roles, Permissions, Audit Logs

-- ============================================
-- 1. ORGANIZATIONS (Tenants)
-- ============================================
CREATE TABLE organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly name
  domain TEXT, -- Custom domain
  industry TEXT, -- Finance, Tech, Healthcare, etc.
  size TEXT, -- Small, Medium, Large, Enterprise
  country TEXT,
  timezone TEXT DEFAULT 'UTC',
  
  -- Subscription & Billing
  plan_type TEXT DEFAULT 'free', -- free, starter, professional, enterprise
  plan_status TEXT DEFAULT 'active', -- active, suspended, cancelled, trial
  max_users INTEGER DEFAULT 5,
  max_risks INTEGER DEFAULT 100,
  trial_ends_at DATETIME,
  
  -- Settings
  settings TEXT, -- JSON with org-specific settings
  features TEXT, -- JSON with enabled features
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  logo_url TEXT,
  website TEXT,
  description TEXT
);

-- ============================================
-- 2. USERS
-- ============================================
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- bcrypt hash
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  
  -- Account status
  status TEXT DEFAULT 'active', -- active, suspended, pending, deactivated
  email_verified INTEGER DEFAULT 0,
  email_verified_at DATETIME,
  
  -- Auth
  last_login_at DATETIME,
  last_login_ip TEXT,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until DATETIME,
  
  -- Password reset
  reset_token TEXT,
  reset_token_expires_at DATETIME,
  
  -- Preferences
  preferences TEXT, -- JSON with user preferences
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'es',
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. USER-ORGANIZATION MEMBERSHIP
-- ============================================
CREATE TABLE organization_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL, -- super_admin, org_admin, org_manager, org_member, org_viewer
  
  -- Status
  status TEXT DEFAULT 'active', -- active, suspended, invited, left
  invited_by INTEGER,
  invited_at DATETIME,
  joined_at DATETIME,
  left_at DATETIME,
  
  -- Permissions override (JSON)
  custom_permissions TEXT,
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(organization_id, user_id)
);

-- ============================================
-- 4. ROLES & PERMISSIONS
-- ============================================
CREATE TABLE roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL, -- super_admin, org_admin, etc.
  display_name TEXT NOT NULL,
  description TEXT,
  is_system_role INTEGER DEFAULT 0, -- System roles can't be deleted
  organization_id INTEGER, -- NULL for system roles
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL, -- risks.create, risks.read, users.manage, etc.
  resource TEXT NOT NULL, -- risks, alerts, users, organizations
  action TEXT NOT NULL, -- create, read, update, delete, manage
  description TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  
  PRIMARY KEY (role_id, permission_id)
);

-- ============================================
-- 5. AUDIT LOGS (Compliance & Security)
-- ============================================
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER,
  user_id INTEGER,
  
  -- Action details
  action TEXT NOT NULL, -- login, create_risk, update_user, delete_organization, etc.
  resource_type TEXT, -- risk, user, organization, alert
  resource_id INTEGER,
  
  -- Context
  ip_address TEXT,
  user_agent TEXT,
  method TEXT, -- GET, POST, PUT, DELETE
  endpoint TEXT, -- /api/risks, /api/users/123
  
  -- Changes (for data modification)
  old_values TEXT, -- JSON
  new_values TEXT, -- JSON
  
  -- Result
  status TEXT, -- success, failure
  error_message TEXT,
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. SESSIONS (JWT Refresh Tokens)
-- ============================================
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  organization_id INTEGER,
  
  refresh_token TEXT UNIQUE NOT NULL,
  access_token_jti TEXT, -- JWT ID for revocation
  
  ip_address TEXT,
  user_agent TEXT,
  
  expires_at DATETIME NOT NULL,
  revoked INTEGER DEFAULT 0,
  revoked_at DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. INVITATIONS
-- ============================================
CREATE TABLE invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  
  token TEXT UNIQUE NOT NULL,
  invited_by INTEGER NOT NULL,
  
  status TEXT DEFAULT 'pending', -- pending, accepted, expired, cancelled
  accepted_at DATETIME,
  expires_at DATETIME NOT NULL,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. MODIFY EXISTING TABLES FOR MULTI-TENANCY
-- ============================================

-- Add organization_id to risks
ALTER TABLE risks ADD COLUMN organization_id INTEGER;
ALTER TABLE risks ADD COLUMN created_by INTEGER;

-- Add organization_id to alerts
ALTER TABLE alerts ADD COLUMN organization_id INTEGER;

-- Add organization_id to mitigation_actions
ALTER TABLE mitigation_actions ADD COLUMN organization_id INTEGER;

-- Add organization_id to metrics
ALTER TABLE metrics ADD COLUMN organization_id INTEGER;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Organizations
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(plan_status);

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- Membership
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_role ON organization_members(role);

-- Audit logs
CREATE INDEX idx_audit_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- Sessions
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(refresh_token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Invitations
CREATE INDEX idx_invitations_org ON invitations(organization_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);

-- Multi-tenancy indexes
CREATE INDEX idx_risks_org ON risks(organization_id);
CREATE INDEX idx_alerts_org ON alerts(organization_id);
CREATE INDEX idx_mitigation_org ON mitigation_actions(organization_id);
CREATE INDEX idx_metrics_org ON metrics(organization_id);
