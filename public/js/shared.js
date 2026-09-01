/* ═══════════════════════════════════════
   Elder Care - Shared JavaScript
   API helpers, authentication, utilities
═══════════════════════════════════════ */

// ─── CONSTANTS ─── 
const API_BASE = '/api/v1';

// ─── AUTHENTICATION ─── 
function getToken() {
  return localStorage.getItem('token');
}

function getRole() {
  return localStorage.getItem('role');
}

function getUserName() {
  return localStorage.getItem('userName') || 'User';
}

// Check if user is authenticated
function requireAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

// ─── API HELPER ─── 
async function apiCall(endpoint, options = {}) {
  const token = getToken();
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    
    // Token expired or invalid
    if (response.status === 401) {
      localStorage.clear();
      window.location.href = '/login.html';
      return;
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ─── TOAST NOTIFICATIONS ─── 
function showToast(msg, isError = false, duration = 3000) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  
  toast.style.background = isError ? '#FDEAEA' : '#EAF5EE';
  toast.style.color = isError ? '#C0392B' : '#2E7D52';
  toast.style.border = isError ? '1px solid #F5CECE' : '1px solid #BADDCA';
  toast.textContent = msg;
  toast.style.opacity = '1';
  
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { 
    toast.style.opacity = '0'; 
  }, duration);
}

// ─── LOGOUT ─── 
function logout() {
  if (confirm('Are you sure you want to log out?')) {
    localStorage.clear();
    window.location.href = '/login.html';
  }
}

// ─── DATE FORMATTING ─── 
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

function formatTime(timeString) {
  if (!timeString) return '';
  return timeString; // Already in HH:MM format
}

function formatDateTime(dateTimeString) {
  const date = new Date(dateTimeString);
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ─── LOADING STATES ─── 
function showLoading(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>
    `;
  }
}

function hideLoading(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '';
  }
}

// ─── ERROR HANDLING ─── 
function handleError(error, message = 'An error occurred') {
  console.error(error);
  showToast(message, true);
}

// ─── INITIALIZATION ─── 
// Run auth check on page load
document.addEventListener('DOMContentLoaded', function() {
  // Check auth for all pages except login
  if (!window.location.pathname.includes('login.html')) {
    requireAuth();
  }
});
