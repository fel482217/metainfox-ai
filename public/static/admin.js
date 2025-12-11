// Metainfox AI - Admin Panel
// Panel de Administración Enterprise

// Global state
let currentUser = null;
let currentOrganization = null;
let users = [];
let organizations = [];
let auditLogs = [];
let currentView = 'dashboard';

// Authentication helpers
function getAccessToken() {
  return localStorage.getItem('access_token');
}

function isAuthenticated() {
  return !!getAccessToken();
}

function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('organization');
  window.location.href = '/login';
}

// Axios interceptor for authentication
axios.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Axios interceptor for token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          logout();
          return Promise.reject(error);
        }
        
        const response = await axios.post('/api/auth/refresh', {
          refresh_token: refreshToken
        });
        
        if (response.data.success) {
          localStorage.setItem('access_token', response.data.access_token);
          originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
          return axios(originalRequest);
        } else {
          logout();
        }
      } catch (refreshError) {
        logout();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🔧 Admin Panel initialized');
  
  // Check authentication
  if (!isAuthenticated()) {
    window.location.href = '/login';
    return;
  }
  
  // Load user data
  try {
    currentUser = JSON.parse(localStorage.getItem('user'));
    currentOrganization = JSON.parse(localStorage.getItem('organization'));
    
    // Check admin permissions
    if (!hasPermission('users.view') && !hasPermission('organizations.view')) {
      alert('No tienes permisos para acceder al panel de administración');
      window.location.href = '/';
      return;
    }
    
    // Update UI with user info
    document.getElementById('adminUserName').textContent = currentUser.full_name;
    document.getElementById('adminOrgName').textContent = currentOrganization.name;
    document.getElementById('adminUserRole').textContent = getRoleDisplayName(currentUser.role);
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial view
    showView('dashboard');
    
  } catch (error) {
    console.error('Error loading user data:', error);
    logout();
  }
});

// Setup event listeners
function setupEventListeners() {
  // Navigation
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const view = e.currentTarget.dataset.view;
      showView(view);
    });
  });
  
  // Users tab buttons
  document.getElementById('btnAddUser')?.addEventListener('click', showAddUserModal);
  document.getElementById('btnRefreshUsers')?.addEventListener('click', loadUsers);
  
  // Organizations tab buttons
  document.getElementById('btnAddOrg')?.addEventListener('click', showAddOrgModal);
  document.getElementById('btnRefreshOrgs')?.addEventListener('click', loadOrganizations);
  
  // Audit logs buttons
  document.getElementById('btnRefreshAudit')?.addEventListener('click', loadAuditLogs);
  
  // Modals
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });
  
  // Forms
  document.getElementById('addUserForm')?.addEventListener('submit', handleAddUser);
  document.getElementById('editUserForm')?.addEventListener('submit', handleEditUser);
  document.getElementById('addOrgForm')?.addEventListener('submit', handleAddOrg);
  document.getElementById('editOrgForm')?.addEventListener('submit', handleEditOrg);
}

// View management
function showView(viewName) {
  currentView = viewName;
  
  // Update navigation
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.classList.remove('bg-blue-600', 'text-white');
    btn.classList.add('bg-gray-200', 'text-gray-700');
  });
  
  document.querySelector(`[data-view="${viewName}"]`)?.classList.remove('bg-gray-200', 'text-gray-700');
  document.querySelector(`[data-view="${viewName}"]`)?.classList.add('bg-blue-600', 'text-white');
  
  // Hide all views
  document.querySelectorAll('[data-content]').forEach(content => {
    content.classList.add('hidden');
  });
  
  // Show selected view
  const viewElement = document.querySelector(`[data-content="${viewName}"]`);
  if (viewElement) {
    viewElement.classList.remove('hidden');
  }
  
  // Load data for view
  switch(viewName) {
    case 'dashboard':
      loadDashboardStats();
      break;
    case 'users':
      loadUsers();
      break;
    case 'organizations':
      if (hasPermission('organizations.view')) {
        loadOrganizations();
      }
      break;
    case 'audit':
      if (hasPermission('system.audit')) {
        loadAuditLogs();
      }
      break;
    case 'settings':
      loadSettings();
      break;
  }
}

// Dashboard stats
async function loadDashboardStats() {
  try {
    const response = await axios.get('/api/admin/stats');
    
    if (response.data.success) {
      const stats = response.data.stats;
      document.getElementById('statTotalUsers').textContent = stats.total_users || 0;
      document.getElementById('statActiveUsers').textContent = stats.active_users || 0;
      document.getElementById('statTotalOrgs').textContent = stats.total_organizations || 0;
      document.getElementById('statActiveOrgs').textContent = stats.active_organizations || 0;
    }
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    showNotification('Error al cargar estadísticas', 'error');
  }
}

// Users management
async function loadUsers() {
  try {
    showLoading('usersList');
    
    const response = await axios.get('/api/admin/users');
    
    if (response.data.success) {
      users = response.data.users;
      renderUsers(users);
    }
  } catch (error) {
    console.error('Error loading users:', error);
    showNotification('Error al cargar usuarios', 'error');
    document.getElementById('usersList').innerHTML = '<p class="text-red-600">Error al cargar usuarios</p>';
  }
}

function renderUsers(userList) {
  const container = document.getElementById('usersList');
  
  if (userList.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-8">No hay usuarios registrados</p>';
    return;
  }
  
  container.innerHTML = userList.map(user => `
    <div class="bg-white border rounded-lg p-4 hover:shadow-md transition">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
            ${user.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 class="font-semibold text-gray-800">${escapeHtml(user.full_name)}</h3>
            <p class="text-sm text-gray-600">${escapeHtml(user.email)}</p>
            <div class="flex gap-2 mt-1">
              <span class="px-2 py-1 text-xs rounded ${getRoleBadgeClass(user.role)}">
                ${getRoleDisplayName(user.role)}
              </span>
              <span class="px-2 py-1 text-xs rounded ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                ${user.is_active ? 'Activo' : 'Suspendido'}
              </span>
            </div>
          </div>
        </div>
        <div class="flex gap-2">
          ${hasPermission('users.update') ? `
            <button onclick="editUser('${user.id}')" class="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
              <i class="fas fa-edit"></i>
            </button>
          ` : ''}
          ${hasPermission('users.update') ? `
            <button onclick="toggleUserStatus('${user.id}', ${user.is_active})" class="px-3 py-2 ${user.is_active ? 'bg-yellow-600' : 'bg-green-600'} text-white rounded hover:opacity-80 text-sm">
              <i class="fas fa-${user.is_active ? 'ban' : 'check'}"></i>
            </button>
          ` : ''}
          ${hasPermission('users.delete') ? `
            <button onclick="deleteUser('${user.id}')" class="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
              <i class="fas fa-trash"></i>
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// Organizations management
async function loadOrganizations() {
  try {
    showLoading('organizationsList');
    
    const response = await axios.get('/api/admin/organizations');
    
    if (response.data.success) {
      organizations = response.data.organizations;
      renderOrganizations(organizations);
    }
  } catch (error) {
    console.error('Error loading organizations:', error);
    showNotification('Error al cargar organizaciones', 'error');
    document.getElementById('organizationsList').innerHTML = '<p class="text-red-600">Error al cargar organizaciones</p>';
  }
}

function renderOrganizations(orgList) {
  const container = document.getElementById('organizationsList');
  
  if (orgList.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-8">No hay organizaciones registradas</p>';
    return;
  }
  
  container.innerHTML = orgList.map(org => `
    <div class="bg-white border rounded-lg p-4 hover:shadow-md transition">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-semibold text-gray-800 text-lg">${escapeHtml(org.name)}</h3>
          <p class="text-sm text-gray-600">Slug: ${escapeHtml(org.slug)}</p>
          <div class="flex gap-2 mt-2">
            <span class="px-2 py-1 text-xs rounded ${getPlanBadgeClass(org.plan_type)}">
              ${getPlanDisplayName(org.plan_type)}
            </span>
            <span class="px-2 py-1 text-xs rounded ${getStatusBadgeClass(org.status)}">
              ${getStatusDisplayName(org.status)}
            </span>
          </div>
          <div class="text-xs text-gray-500 mt-2">
            Usuarios: ${org.max_users} | Riesgos: ${org.max_risks}
          </div>
        </div>
        <div class="flex gap-2">
          ${hasPermission('organizations.update') ? `
            <button onclick="editOrganization('${org.id}')" class="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
              <i class="fas fa-edit"></i>
            </button>
          ` : ''}
          ${hasPermission('organizations.delete') ? `
            <button onclick="deleteOrganization('${org.id}')" class="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
              <i class="fas fa-trash"></i>
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// Audit logs
async function loadAuditLogs() {
  try {
    showLoading('auditLogsList');
    
    const response = await axios.get('/api/admin/audit-logs');
    
    if (response.data.success) {
      auditLogs = response.data.logs;
      renderAuditLogs(auditLogs);
    }
  } catch (error) {
    console.error('Error loading audit logs:', error);
    showNotification('Error al cargar logs de auditoría', 'error');
    document.getElementById('auditLogsList').innerHTML = '<p class="text-red-600">Error al cargar logs</p>';
  }
}

function renderAuditLogs(logs) {
  const container = document.getElementById('auditLogsList');
  
  if (logs.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-8">No hay logs de auditoría</p>';
    return;
  }
  
  container.innerHTML = logs.map(log => `
    <div class="bg-white border rounded-lg p-4">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <span class="px-2 py-1 text-xs rounded ${getActionBadgeClass(log.action_type)}">
              ${escapeHtml(log.action_type)}
            </span>
            <span class="text-sm text-gray-600">${escapeHtml(log.user_email || 'Sistema')}</span>
          </div>
          <p class="text-sm text-gray-800 mt-2">${escapeHtml(log.resource_type)}: ${escapeHtml(log.resource_id || 'N/A')}</p>
          ${log.changes ? `<p class="text-xs text-gray-600 mt-1">Cambios: ${escapeHtml(log.changes)}</p>` : ''}
          <p class="text-xs text-gray-500 mt-2">
            <i class="fas fa-clock mr-1"></i>
            ${new Date(log.created_at).toLocaleString('es-ES')}
            ${log.ip_address ? ` | IP: ${escapeHtml(log.ip_address)}` : ''}
          </p>
        </div>
        <span class="px-2 py-1 text-xs rounded ${log.is_success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
          ${log.is_success ? 'Éxito' : 'Fallo'}
        </span>
      </div>
    </div>
  `).join('');
}

// Settings
async function loadSettings() {
  try {
    const response = await axios.get('/api/admin/settings');
    
    if (response.data.success) {
      const settings = response.data.settings;
      renderSettings(settings);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showNotification('Error al cargar configuración', 'error');
  }
}

function renderSettings(settings) {
  document.getElementById('settingsOrgName').value = currentOrganization.name;
  document.getElementById('settingsMaxUsers').value = currentOrganization.max_users || 10;
  document.getElementById('settingsMaxRisks').value = currentOrganization.max_risks || 100;
  document.getElementById('settingsPlanType').value = currentOrganization.plan_type || 'free';
}

// User actions
function showAddUserModal() {
  document.getElementById('addUserModal').classList.remove('hidden');
  document.getElementById('addUserForm').reset();
}

async function handleAddUser(e) {
  e.preventDefault();
  
  const formData = {
    email: document.getElementById('addUserEmail').value,
    full_name: document.getElementById('addUserFullName').value,
    password: document.getElementById('addUserPassword').value,
    role: document.getElementById('addUserRole').value
  };
  
  try {
    const response = await axios.post('/api/admin/users', formData);
    
    if (response.data.success) {
      showNotification('Usuario creado exitosamente', 'success');
      closeAllModals();
      loadUsers();
    }
  } catch (error) {
    console.error('Error creating user:', error);
    showNotification(error.response?.data?.error || 'Error al crear usuario', 'error');
  }
}

async function editUser(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) return;
  
  document.getElementById('editUserId').value = user.id;
  document.getElementById('editUserEmail').value = user.email;
  document.getElementById('editUserFullName').value = user.full_name;
  document.getElementById('editUserRole').value = user.role;
  
  document.getElementById('editUserModal').classList.remove('hidden');
}

async function handleEditUser(e) {
  e.preventDefault();
  
  const userId = document.getElementById('editUserId').value;
  const formData = {
    full_name: document.getElementById('editUserFullName').value,
    role: document.getElementById('editUserRole').value
  };
  
  const newPassword = document.getElementById('editUserPassword').value;
  if (newPassword) {
    formData.password = newPassword;
  }
  
  try {
    const response = await axios.put(`/api/admin/users/${userId}`, formData);
    
    if (response.data.success) {
      showNotification('Usuario actualizado exitosamente', 'success');
      closeAllModals();
      loadUsers();
    }
  } catch (error) {
    console.error('Error updating user:', error);
    showNotification(error.response?.data?.error || 'Error al actualizar usuario', 'error');
  }
}

async function toggleUserStatus(userId, currentStatus) {
  const action = currentStatus ? 'suspender' : 'activar';
  if (!confirm(`¿Estás seguro de ${action} este usuario?`)) return;
  
  try {
    const response = await axios.put(`/api/admin/users/${userId}/status`, {
      is_active: !currentStatus
    });
    
    if (response.data.success) {
      showNotification(`Usuario ${currentStatus ? 'suspendido' : 'activado'} exitosamente`, 'success');
      loadUsers();
    }
  } catch (error) {
    console.error('Error toggling user status:', error);
    showNotification(error.response?.data?.error || 'Error al cambiar estado del usuario', 'error');
  }
}

async function deleteUser(userId) {
  if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) return;
  
  try {
    const response = await axios.delete(`/api/admin/users/${userId}`);
    
    if (response.data.success) {
      showNotification('Usuario eliminado exitosamente', 'success');
      loadUsers();
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    showNotification(error.response?.data?.error || 'Error al eliminar usuario', 'error');
  }
}

// Organization actions
function showAddOrgModal() {
  document.getElementById('addOrgModal').classList.remove('hidden');
  document.getElementById('addOrgForm').reset();
}

async function handleAddOrg(e) {
  e.preventDefault();
  
  const formData = {
    name: document.getElementById('addOrgName').value,
    plan_type: document.getElementById('addOrgPlan').value,
    max_users: parseInt(document.getElementById('addOrgMaxUsers').value),
    max_risks: parseInt(document.getElementById('addOrgMaxRisks').value)
  };
  
  try {
    const response = await axios.post('/api/admin/organizations', formData);
    
    if (response.data.success) {
      showNotification('Organización creada exitosamente', 'success');
      closeAllModals();
      loadOrganizations();
    }
  } catch (error) {
    console.error('Error creating organization:', error);
    showNotification(error.response?.data?.error || 'Error al crear organización', 'error');
  }
}

async function editOrganization(orgId) {
  const org = organizations.find(o => o.id === orgId);
  if (!org) return;
  
  document.getElementById('editOrgId').value = org.id;
  document.getElementById('editOrgName').value = org.name;
  document.getElementById('editOrgPlan').value = org.plan_type;
  document.getElementById('editOrgStatus').value = org.status;
  document.getElementById('editOrgMaxUsers').value = org.max_users;
  document.getElementById('editOrgMaxRisks').value = org.max_risks;
  
  document.getElementById('editOrgModal').classList.remove('hidden');
}

async function handleEditOrg(e) {
  e.preventDefault();
  
  const orgId = document.getElementById('editOrgId').value;
  const formData = {
    name: document.getElementById('editOrgName').value,
    plan_type: document.getElementById('editOrgPlan').value,
    status: document.getElementById('editOrgStatus').value,
    max_users: parseInt(document.getElementById('editOrgMaxUsers').value),
    max_risks: parseInt(document.getElementById('editOrgMaxRisks').value)
  };
  
  try {
    const response = await axios.put(`/api/admin/organizations/${orgId}`, formData);
    
    if (response.data.success) {
      showNotification('Organización actualizada exitosamente', 'success');
      closeAllModals();
      loadOrganizations();
    }
  } catch (error) {
    console.error('Error updating organization:', error);
    showNotification(error.response?.data?.error || 'Error al actualizar organización', 'error');
  }
}

async function deleteOrganization(orgId) {
  if (!confirm('¿Estás seguro de eliminar esta organización? Todos los datos asociados se perderán.')) return;
  
  try {
    const response = await axios.delete(`/api/admin/organizations/${orgId}`);
    
    if (response.data.success) {
      showNotification('Organización eliminada exitosamente', 'success');
      loadOrganizations();
    }
  } catch (error) {
    console.error('Error deleting organization:', error);
    showNotification(error.response?.data?.error || 'Error al eliminar organización', 'error');
  }
}

// Helper functions
function hasPermission(permission) {
  const userPermissions = JSON.parse(localStorage.getItem('permissions') || '[]');
  return userPermissions.includes(permission) || currentUser?.role === 'super_admin';
}

function getRoleDisplayName(role) {
  const roleNames = {
    'super_admin': 'Super Admin',
    'org_admin': 'Admin',
    'org_manager': 'Manager',
    'org_member': 'Miembro',
    'org_viewer': 'Visor'
  };
  return roleNames[role] || role;
}

function getRoleBadgeClass(role) {
  const classes = {
    'super_admin': 'bg-purple-100 text-purple-800',
    'org_admin': 'bg-red-100 text-red-800',
    'org_manager': 'bg-blue-100 text-blue-800',
    'org_member': 'bg-green-100 text-green-800',
    'org_viewer': 'bg-gray-100 text-gray-800'
  };
  return classes[role] || 'bg-gray-100 text-gray-800';
}

function getPlanDisplayName(plan) {
  const planNames = {
    'free': 'Gratis',
    'basic': 'Básico',
    'professional': 'Profesional',
    'enterprise': 'Enterprise'
  };
  return planNames[plan] || plan;
}

function getPlanBadgeClass(plan) {
  const classes = {
    'free': 'bg-gray-100 text-gray-800',
    'basic': 'bg-blue-100 text-blue-800',
    'professional': 'bg-purple-100 text-purple-800',
    'enterprise': 'bg-yellow-100 text-yellow-800'
  };
  return classes[plan] || 'bg-gray-100 text-gray-800';
}

function getStatusDisplayName(status) {
  const statusNames = {
    'trial': 'Prueba',
    'active': 'Activo',
    'suspended': 'Suspendido',
    'cancelled': 'Cancelado'
  };
  return statusNames[status] || status;
}

function getStatusBadgeClass(status) {
  const classes = {
    'trial': 'bg-blue-100 text-blue-800',
    'active': 'bg-green-100 text-green-800',
    'suspended': 'bg-yellow-100 text-yellow-800',
    'cancelled': 'bg-red-100 text-red-800'
  };
  return classes[status] || 'bg-gray-100 text-gray-800';
}

function getActionBadgeClass(action) {
  const classes = {
    'create': 'bg-green-100 text-green-800',
    'update': 'bg-blue-100 text-blue-800',
    'delete': 'bg-red-100 text-red-800',
    'login': 'bg-purple-100 text-purple-800',
    'logout': 'bg-gray-100 text-gray-800'
  };
  return classes[action] || 'bg-gray-100 text-gray-800';
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function showLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-4xl text-blue-600"></i><p class="mt-4 text-gray-600">Cargando...</p></div>';
  }
}

function showNotification(message, type = 'info') {
  const bgColor = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
  
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in`;
  notification.innerHTML = `
    <div class="flex items-center gap-2">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function closeAllModals() {
  document.querySelectorAll('[id$="Modal"]').forEach(modal => {
    modal.classList.add('hidden');
  });
}
