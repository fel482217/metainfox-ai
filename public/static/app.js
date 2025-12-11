// Metainfox AI - Frontend Application

// Global state
let currentRisks = [];
let dashboardStats = {};
let chatHistory = [];

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Metainfox AI initialized');
  
  // Load initial data
  await loadDashboard();
  await loadRisks();
  
  // Setup event listeners
  setupEventListeners();
  
  // Auto-refresh every 30 seconds
  setInterval(loadDashboard, 30000);
});

// Setup event listeners
function setupEventListeners() {
  // Tab navigation
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.dataset.tab;
      switchTab(tabName);
    });
  });
  
  // Filter risks
  const filterCategory = document.getElementById('filterCategory');
  const filterSeverity = document.getElementById('filterSeverity');
  
  if (filterCategory) {
    filterCategory.addEventListener('change', filterRisks);
  }
  if (filterSeverity) {
    filterSeverity.addEventListener('change', filterRisks);
  }
  
  // Chat submit
  const chatForm = document.getElementById('chatForm');
  if (chatForm) {
    chatForm.addEventListener('submit', handleChatSubmit);
  }
  
  // Analyze new risk
  const analyzeForm = document.getElementById('analyzeForm');
  if (analyzeForm) {
    analyzeForm.addEventListener('submit', handleAnalyzeSubmit);
  }
}

// Tab switching
function switchTab(tabName) {
  // Update buttons
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.classList.remove('bg-blue-600', 'text-white');
    btn.classList.add('bg-gray-200', 'text-gray-700');
  });
  
  document.querySelector(`[data-tab="${tabName}"]`).classList.remove('bg-gray-200', 'text-gray-700');
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('bg-blue-600', 'text-white');
  
  // Show/hide content
  document.querySelectorAll('[data-content]').forEach(content => {
    content.classList.add('hidden');
  });
  
  document.querySelector(`[data-content="${tabName}"]`).classList.remove('hidden');
  
  // Load data for specific tab
  if (tabName === 'chat') {
    document.getElementById('chatInput')?.focus();
  } else if (tabName === 'analyze') {
    document.getElementById('analyzeInput')?.focus();
  }
}

// Load dashboard stats
async function loadDashboard() {
  try {
    const response = await axios.get('/api/dashboard/stats');
    dashboardStats = response.data;
    
    updateDashboardUI(dashboardStats);
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showNotification('Error cargando dashboard', 'error');
  }
}

// Update dashboard UI
function updateDashboardUI(stats) {
  // Update stat cards
  document.getElementById('statTotalRisks').textContent = stats.total_risks || 0;
  document.getElementById('statActiveRisks').textContent = stats.active_risks || 0;
  document.getElementById('statCriticalRisks').textContent = stats.critical_risks || 0;
  document.getElementById('statResponseTime').textContent = `${stats.avg_response_time || 0}h`;
  document.getElementById('statCostSaved').textContent = `$${formatNumber(stats.cost_saved_month || 0)}`;
  document.getElementById('statThreatsMitigated').textContent = stats.threats_mitigated_week || 0;
  
  // Update risk score with color
  const riskScore = stats.risk_score || 0;
  const riskScoreEl = document.getElementById('statRiskScore');
  riskScoreEl.textContent = riskScore;
  
  // Color based on score (lower is better)
  riskScoreEl.className = 'text-3xl font-bold ';
  if (riskScore >= 70) {
    riskScoreEl.classList.add('text-red-600');
  } else if (riskScore >= 40) {
    riskScoreEl.classList.add('text-yellow-600');
  } else {
    riskScoreEl.classList.add('text-green-600');
  }
}

// Load risks list
async function loadRisks() {
  try {
    const response = await axios.get('/api/risks');
    currentRisks = response.data.risks || [];
    
    displayRisks(currentRisks);
  } catch (error) {
    console.error('Error loading risks:', error);
    showNotification('Error cargando riesgos', 'error');
  }
}

// Display risks in UI
function displayRisks(risks) {
  const container = document.getElementById('risksList');
  if (!container) return;
  
  if (risks.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-8">No hay riesgos para mostrar</p>';
    return;
  }
  
  container.innerHTML = risks.map(risk => `
    <div class="bg-white rounded-lg shadow-md p-4 border-l-4 ${getSeverityColor(risk.severity)}">
      <div class="flex justify-between items-start mb-2">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2 py-1 rounded text-xs font-semibold ${getCategoryBadge(risk.category)}">
              ${risk.category}
            </span>
            <span class="px-2 py-1 rounded text-xs font-semibold ${getSeverityBadge(risk.severity)}">
              ${risk.severity}
            </span>
            <span class="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
              Score: ${risk.risk_score || 0}
            </span>
          </div>
          <h3 class="font-bold text-gray-900 mb-1">${risk.title}</h3>
          <p class="text-sm text-gray-600 mb-2">${risk.description || 'Sin descripción'}</p>
          <div class="flex items-center gap-4 text-xs text-gray-500">
            <span><i class="fas fa-clock mr-1"></i>${formatDate(risk.detected_at)}</span>
            <span><i class="fas fa-source mr-1"></i>${risk.source}</span>
            ${risk.assigned_to ? `<span><i class="fas fa-user mr-1"></i>${risk.assigned_to}</span>` : ''}
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <button onclick="viewRiskDetails(${risk.id})" class="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
            <i class="fas fa-eye mr-1"></i>Ver
          </button>
          ${risk.status === 'open' ? `
            <button onclick="mitigateRisk(${risk.id})" class="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600">
              <i class="fas fa-shield-alt mr-1"></i>Mitigar
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// Filter risks
function filterRisks() {
  const category = document.getElementById('filterCategory')?.value;
  const severity = document.getElementById('filterSeverity')?.value;
  
  let filtered = [...currentRisks];
  
  if (category && category !== 'all') {
    filtered = filtered.filter(r => r.category === category);
  }
  
  if (severity && severity !== 'all') {
    filtered = filtered.filter(r => r.severity === severity);
  }
  
  displayRisks(filtered);
}

// Handle chat submit
async function handleChatSubmit(e) {
  e.preventDefault();
  
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  
  if (!message) return;
  
  // Add user message to UI
  addChatMessage('user', message);
  input.value = '';
  
  // Show loading
  addChatMessage('assistant', 'Analizando...', true);
  
  try {
    const response = await axios.post('/api/chat', { message });
    
    // Remove loading message
    const messages = document.getElementById('chatMessages');
    messages.removeChild(messages.lastChild);
    
    // Add AI response
    addChatMessage('assistant', response.data.response);
    
  } catch (error) {
    console.error('Chat error:', error);
    const messages = document.getElementById('chatMessages');
    messages.removeChild(messages.lastChild);
    addChatMessage('assistant', 'Error: No pude procesar tu consulta. Por favor intenta de nuevo.');
  }
}

// Add message to chat
function addChatMessage(role, content, isLoading = false) {
  const messages = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;
  
  div.innerHTML = `
    <div class="max-w-[80%] rounded-lg p-3 ${role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'}">
      ${isLoading ? '<i class="fas fa-spinner fa-spin mr-2"></i>' : ''}
      <p class="text-sm whitespace-pre-wrap">${content}</p>
    </div>
  `;
  
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

// Handle analyze submit
async function handleAnalyzeSubmit(e) {
  e.preventDefault();
  
  const input = document.getElementById('analyzeInput');
  const text = input.value.trim();
  
  if (!text) return;
  
  const resultDiv = document.getElementById('analyzeResult');
  resultDiv.innerHTML = '<p class="text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>Analizando con IA...</p>';
  
  try {
    const response = await axios.post('/api/analyze', { text });
    const analysis = response.data;
    
    resultDiv.innerHTML = `
      <div class="bg-white rounded-lg border-2 border-blue-500 p-4">
        <h3 class="font-bold text-lg mb-3">Análisis Completado</h3>
        
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p class="text-sm text-gray-600">Categoría</p>
            <span class="px-3 py-1 rounded ${getCategoryBadge(analysis.category)}">${analysis.category}</span>
          </div>
          <div>
            <p class="text-sm text-gray-600">Severidad</p>
            <span class="px-3 py-1 rounded ${getSeverityBadge(analysis.severity)}">${analysis.severity}</span>
          </div>
          <div>
            <p class="text-sm text-gray-600">Confianza</p>
            <p class="font-bold">${Math.round(analysis.confidence * 100)}%</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Score de Riesgo</p>
            <p class="font-bold">${analysis.risk_score || 'N/A'}</p>
          </div>
        </div>
        
        <div class="mb-3">
          <p class="text-sm text-gray-600 mb-1">Análisis</p>
          <p class="text-sm text-gray-800">${analysis.analysis}</p>
        </div>
        
        ${analysis.keywords && analysis.keywords.length > 0 ? `
          <div>
            <p class="text-sm text-gray-600 mb-1">Palabras clave</p>
            <div class="flex flex-wrap gap-2">
              ${analysis.keywords.map(k => `<span class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">${k}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        
        <button onclick="saveAnalysisAsRisk()" class="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          <i class="fas fa-save mr-2"></i>Guardar como Riesgo
        </button>
      </div>
    `;
    
  } catch (error) {
    console.error('Analysis error:', error);
    resultDiv.innerHTML = '<p class="text-red-600">Error en el análisis. Por favor intenta de nuevo.</p>';
  }
}

// View risk details
async function viewRiskDetails(riskId) {
  try {
    const response = await axios.get(`/api/risks/${riskId}`);
    const risk = response.data;
    
    // Show modal with details (implement modal)
    alert(`Riesgo #${risk.id}\n\n${risk.title}\n\n${risk.description}\n\nScore: ${risk.risk_score}`);
    
  } catch (error) {
    console.error('Error loading risk details:', error);
    showNotification('Error cargando detalles', 'error');
  }
}

// Mitigate risk
async function mitigateRisk(riskId) {
  const action = prompt('Describe la acción de mitigación:');
  if (!action) return;
  
  try {
    await axios.post(`/api/risks/${riskId}/mitigate`, { action });
    showNotification('Acción de mitigación registrada', 'success');
    await loadRisks();
  } catch (error) {
    console.error('Error mitigating risk:', error);
    showNotification('Error al registrar mitigación', 'error');
  }
}

// Helper functions
function getSeverityColor(severity) {
  const colors = {
    critical: 'border-red-600',
    high: 'border-orange-500',
    medium: 'border-yellow-500',
    low: 'border-blue-500'
  };
  return colors[severity] || 'border-gray-500';
}

function getSeverityBadge(severity) {
  const badges = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-blue-100 text-blue-800'
  };
  return badges[severity] || 'bg-gray-100 text-gray-800';
}

function getCategoryBadge(category) {
  const badges = {
    cybersecurity: 'bg-purple-100 text-purple-800',
    financial: 'bg-green-100 text-green-800',
    operational: 'bg-blue-100 text-blue-800',
    reputational: 'bg-pink-100 text-pink-800',
    regulatory: 'bg-indigo-100 text-indigo-800',
    strategic: 'bg-gray-100 text-gray-800'
  };
  return badges[category] || 'bg-gray-100 text-gray-800';
}

function formatNumber(num) {
  return new Intl.NumberFormat('en-US').format(num);
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('es-ES', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function showNotification(message, type = 'info') {
  // Simple notification (can be improved with toast library)
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  };
  
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50`;
  notification.innerHTML = `<p>${message}</p>`;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}
