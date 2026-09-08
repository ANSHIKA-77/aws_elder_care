/* ═══════════════════════════════════════
   Elder Care - Shared JavaScript
   API helpers, authentication, utilities
═══════════════════════════════════════ */

// ─── CONSTANTS ───
// API_BASE is set by public/js/config.js loaded before this file.
// Local dev  → '/api/v1'
// Production → 'https://your-api-gateway.amazonaws.com/api/v1'
const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || '/api/v1';

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
// Run auth check and listeners on page load
function bootShared() {
  const path = window.location.pathname;
  if (!path.includes('login.html')) {
    requireAuth();
    if (!path.includes('video.html')) {
      initIncomingCallListener();
      initActiveEmergencyListener();
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootShared);
} else {
  // Document already parsed, boot immediately
  bootShared();
}

// ─── INCOMING VIDEO CALL SIGNALING & MODAL ───
let _ringtoneTimer = null;
let _audioCtx = null;
let _lastDeclinedCallTime = 0;

function playRingChime() {
  try {
    if (!_audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) _audioCtx = new AudioCtx();
    }
    if (_audioCtx && _audioCtx.state === 'suspended') {
      _audioCtx.resume();
    }
    if (!_audioCtx) return;

    // Dual-tone gentle chime
    const now = _audioCtx.currentTime;
    const osc1 = _audioCtx.createOscillator();
    const osc2 = _audioCtx.createOscillator();
    const gainNode = _audioCtx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.setValueAtTime(880, now + 0.15); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(440, now); // A4
    osc2.frequency.setValueAtTime(659.25, now + 0.15); // E5

    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(_audioCtx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.9);
    osc2.stop(now + 0.9);
  } catch (e) {
    // Silent fail if browser restricts autoplay before gesture
  }
}

function startRingtone() {
  if (_ringtoneTimer) return;
  playRingChime();
  _ringtoneTimer = setInterval(playRingChime, 2400);
}

function stopRingtone() {
  if (_ringtoneTimer) {
    clearInterval(_ringtoneTimer);
    _ringtoneTimer = null;
  }
}

function showIncomingCallModal(call) {
  let modal = document.getElementById('incomingCallModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'incomingCallModal';
    modal.innerHTML = `
      <style>
        @keyframes callPulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(46, 125, 82, 0.4); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(46, 125, 82, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(46, 125, 82, 0); }
        }
        @keyframes ringShake {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-15deg); }
          40% { transform: rotate(15deg); }
          60% { transform: rotate(-10deg); }
          80% { transform: rotate(10deg); }
        }
        #incomingCallModal {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(18, 30, 22, 0.72);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .call-card {
          background: #FFFFFF;
          border-radius: 28px;
          padding: 36px 28px;
          max-width: 420px;
          width: 100%;
          text-align: center;
          box-shadow: 0 24px 70px rgba(0,0,0,0.35);
          border: 2px solid #2E7D52;
        }
        .call-avatar-ring {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: #EAF5EE;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          animation: callPulse 2s infinite;
        }
        .call-avatar-icon {
          font-size: 44px;
          animation: ringShake 1s infinite ease-in-out;
        }
        .call-tag {
          display: inline-block;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: #2E7D52;
          background: #EAF5EE;
          padding: 4px 14px;
          border-radius: 20px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .call-actions {
          display: flex;
          gap: 14px;
          margin-top: 28px;
        }
        .btn-call-decline {
          flex: 1;
          padding: 14px;
          border-radius: 16px;
          border: 1.5px solid #F5CECE;
          background: #FFF5F5;
          color: #C0392B;
          font-size: 14.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.18s;
        }
        .btn-call-decline:hover {
          background: #FDEAEA;
        }
        .btn-call-accept {
          flex: 1.2;
          padding: 14px;
          border-radius: 16px;
          border: none;
          background: linear-gradient(135deg, #2E7D52, #40916C);
          color: #FFFFFF;
          font-size: 14.5px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(46, 125, 82, 0.35);
          transition: all 0.18s;
        }
        .btn-call-accept:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(46, 125, 82, 0.45);
        }
      </style>
      <div class="call-card">
        <div class="call-avatar-ring">
          <span class="call-avatar-icon">📹</span>
        </div>
        <div class="call-tag">Incoming Video Call</div>
        <h2 id="callCallerTitle" style="font-family:'DM Serif Display',serif;font-size:24px;color:#1B251F;margin:0 0 6px;">Caretaker Calling</h2>
        <p id="callCallerSubtitle" style="font-size:14px;color:#5C6B61;margin:0;">Inviting you to join a live family video session</p>
        <div class="call-actions">
          <button class="btn-call-decline" onclick="declineIncomingCall()">✕ Decline</button>
          <button class="btn-call-accept" onclick="acceptIncomingCall()">📹 Join Call</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const roleLabel = (call.callerRole === 'caretaker') ? 'Caretaker' : 'Client';
  const callerName = call.callerName || roleLabel;
  const titleEl = document.getElementById('callCallerTitle');
  const subEl = document.getElementById('callCallerSubtitle');
  if (titleEl) titleEl.textContent = `${callerName} (${roleLabel})`;
  if (subEl) subEl.textContent = `${roleLabel} is calling you right now. Click Join to connect.`;

  modal.style.display = 'flex';
  startRingtone();
}

function hideIncomingCallModal() {
  const modal = document.getElementById('incomingCallModal');
  if (modal) modal.style.display = 'none';
  stopRingtone();
}

function acceptIncomingCall() {
  hideIncomingCallModal();
  window.location.href = '/video.html';
}

function declineIncomingCall() {
  hideIncomingCallModal();
  _lastDeclinedCallTime = Date.now();
  apiCall('/video/call/end', { method: 'POST' }).catch(() => {});
}

function initIncomingCallListener() {
  // Never poll on video.html or if not logged in
  if (window.location.pathname.includes('video.html') || !getToken()) return;

  async function checkCallStatus() {
    try {
      const token = getToken();
      if (!token) return;

      const res = await fetch(`${API_BASE}/video/call/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;

      const data = await res.json();
      const activeCall = data && data.data && data.data.activeCall;

      if (activeCall && activeCall.status === 'ringing') {
        const myRole = getRole();
        // Only ring if caller is the other role (e.g. Caretaker calling Client, or Client calling Caretaker)
        const isOtherCaller = activeCall.callerRole !== myRole;
        const notRecentlyDeclined = (Date.now() - _lastDeclinedCallTime) > 30000;

        if (isOtherCaller && notRecentlyDeclined) {
          showIncomingCallModal(activeCall);
          return;
        }
      }

      // If call is no longer active, dismiss any open ringing modal
      hideIncomingCallModal();
    } catch (e) {
      // Background check error — ignore silently
    }
  }

  // Poll every 3 seconds for fast responsiveness
  setInterval(checkCallStatus, 3000);
}

// ─── GLOBAL ACTIVE EMERGENCY POPUP MODAL & ALARM ───
let _sirenTimer = null;
let _sirenMuted = false;
let _lastDismissedAlertId = null;
let _lastDismissedAlertTime = 0;
let _currentActiveEmergencyAlert = null;

function toggleSirenMute() {
  _sirenMuted = !_sirenMuted;
  const muteBtn = document.getElementById('emModalMuteBtn');
  if (_sirenMuted) {
    stopSiren();
    if (muteBtn) {
      muteBtn.innerHTML = '🔇 Sound Muted';
      muteBtn.classList.add('muted');
    }
  } else {
    startSiren();
    if (muteBtn) {
      muteBtn.innerHTML = '🔊 Mute Siren';
      muteBtn.classList.remove('muted');
    }
  }
}

function playSirenPulse() {
  if (_sirenMuted) return;
  try {
    if (!_audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) _audioCtx = new AudioCtx();
    }
    if (_audioCtx && _audioCtx.state === 'suspended') {
      _audioCtx.resume();
    }
    if (!_audioCtx) return;

    const now = _audioCtx.currentTime;
    const osc = _audioCtx.createOscillator();
    const gainNode = _audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.35);
    osc.frequency.setValueAtTime(880, now + 0.4);
    osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.75);

    gainNode.gain.setValueAtTime(0.18, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.85);

    osc.connect(gainNode);
    gainNode.connect(_audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.85);
  } catch (e) {
    // Autoplay restrictions
  }
}

function startSiren() {
  if (_sirenMuted || _sirenTimer) return;
  playSirenPulse();
  _sirenTimer = setInterval(playSirenPulse, 1800);
}

function stopSiren() {
  if (_sirenTimer) {
    clearInterval(_sirenTimer);
    _sirenTimer = null;
  }
}

function updateHomeEmergencyBanner(alert, senderName, alertTypeStr) {
  const homeBanner = document.getElementById('homeEmergencyAlertBanner');
  if (!homeBanner) return;

  if (!alert) {
    homeBanner.style.display = 'none';
    return;
  }

  homeBanner.style.display = 'block';
  const desc = document.getElementById('homeEmergencyDesc');
  if (desc) {
    const timeStr = new Date(alert.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const myRole = getRole() || 'client';
    if (myRole === 'caretaker') {
      if (alert.triggeredByRole === 'caretaker') {
        desc.textContent = `🚨 Emergency alert broadcast initiated by you at ${timeStr}. Connect with your client!`;
      } else {
        desc.textContent = `🚨 ${alertTypeStr || 'SOS Alert'} triggered by ${senderName || 'Client'} at ${timeStr}. Check immediately!`;
      }
    } else {
      if (alert.triggeredByRole === 'client') {
        desc.textContent = `🚨 Your SOS alert is ACTIVE (${timeStr}). Caregiver notified.`;
      } else {
        desc.textContent = `🚨 Emergency alert initiated by your caregiver (${senderName || 'Caretaker'}) at ${timeStr}!`;
      }
    }
  }
}

function showActiveEmergencyModal(alert) {
  _currentActiveEmergencyAlert = alert;
  let modal = document.getElementById('incomingEmergencyModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'incomingEmergencyModal';
    modal.innerHTML = `
      <style>
        @keyframes emPulseRing {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(217, 79, 79, 0.6); }
          70% { transform: scale(1.08); box-shadow: 0 0 0 25px rgba(217, 79, 79, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(217, 79, 79, 0); }
        }
        @keyframes emShake {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-12deg); }
          40% { transform: rotate(12deg); }
          60% { transform: rotate(-8deg); }
          80% { transform: rotate(8deg); }
        }
        #incomingEmergencyModal {
          position: fixed !important;
          top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
          width: 100vw !important; height: 100vh !important;
          background: rgba(35, 8, 8, 0.88) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          z-index: 2147483647 !important;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .em-modal-card {
          background: #FFFFFF;
          border-radius: 28px;
          padding: 32px 28px;
          max-width: 460px;
          width: 100%;
          text-align: center;
          box-shadow: 0 24px 80px rgba(217, 79, 79, 0.45);
          border: 3px solid #D94F4F;
          animation: alertPop 0.25s ease-out;
          position: relative;
        }
        .em-mute-corner-btn {
          position: absolute;
          top: 16px;
          right: 18px;
          background: #FEE2E2;
          border: 1px solid #FECACA;
          color: #DC2626;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: all 0.2s;
        }
        .em-mute-corner-btn:hover {
          background: #FCA5A5;
        }
        .em-mute-corner-btn.muted {
          background: #E5E7EB;
          border-color: #D1D5DB;
          color: #4B5563;
        }
        .em-avatar-ring {
          width: 86px;
          height: 86px;
          border-radius: 50%;
          background: #FEE2E2;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 6px auto 14px;
          box-shadow: 0 0 0 0 rgba(217, 79, 79, 0.6);
          animation: emPulseRing 1.8s infinite;
        }
        .em-avatar-icon {
          font-size: 40px;
          animation: emShake 1.8s infinite ease-in-out;
          display: inline-block;
        }
        .em-alert-tag {
          display: inline-block;
          background: #FEE2E2;
          color: #DC2626;
          font-size: 11.5px;
          font-weight: 800;
          letter-spacing: 1.5px;
          padding: 4px 14px;
          border-radius: 999px;
          margin-bottom: 10px;
          border: 1px solid #FECACA;
        }
        .em-actions-stack {
          margin-top: 22px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .btn-em-call {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #DC2626;
          color: white !important;
          text-decoration: none;
          font-weight: 700;
          font-size: 15px;
          padding: 13px 20px;
          border-radius: 14px;
          box-shadow: 0 6px 20px rgba(220, 38, 38, 0.35);
          transition: all 0.2s;
        }
        .btn-em-call:hover {
          background: #B91C1C;
          transform: translateY(-2px);
        }
        .btn-em-loc {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #F3F4F6;
          color: #374151 !important;
          text-decoration: none;
          font-weight: 700;
          font-size: 14px;
          padding: 12px 18px;
          border-radius: 14px;
          border: 1px solid #E5E7EB;
        }
        .btn-em-loc:hover {
          background: #E5E7EB;
        }
        .btn-em-resolve {
          background: #10B981;
          color: white;
          border: none;
          font-weight: 700;
          font-size: 14px;
          padding: 13px 20px;
          border-radius: 14px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
          transition: all 0.2s;
        }
        .btn-em-resolve:hover {
          background: #059669;
        }
        .btn-em-dismiss {
          background: transparent;
          color: #9CA3AF;
          border: none;
          font-weight: 600;
          font-size: 13px;
          padding: 8px;
          cursor: pointer;
        }
        .btn-em-dismiss:hover {
          color: #4B5563;
        }
      </style>
      <div class="em-modal-card">
        <button id="emModalMuteBtn" class="em-mute-corner-btn" onclick="toggleSirenMute()">🔊 Mute Siren</button>
        <div class="em-avatar-ring">
          <span class="em-avatar-icon">🚨</span>
        </div>
        <div id="emModalTag" class="em-alert-tag">ACTIVE EMERGENCY ALERT</div>
        <h2 id="emModalTitle" style="font-family:'DM Serif Display',serif;font-size:24px;color:#991B1B;margin:0 0 6px;">Manual SOS Triggered</h2>
        <p id="emModalDesc" style="font-size:14px;color:#374151;margin:0 0 4px;font-weight:600;">Client needs immediate assistance!</p>
        <p id="emModalTime" style="font-size:12.5px;color:#6B7280;margin:0;"></p>
        
        <div class="em-actions-stack">
          <a id="emModalCallBtn" href="/video.html" class="btn-em-call" onclick="stopSiren()">📹 Immediate Video Call</a>
          <a id="emModalLocBtn" href="#" target="_blank" class="btn-em-loc" style="display:none;">📍 View Google Maps Location</a>
          <button id="emModalResolveBtn" class="btn-em-resolve" onclick="resolveEmergencyFromModal()">✅ Acknowledge & Mark Resolved</button>
          <button class="btn-em-dismiss" onclick="dismissEmergencyModal()">✕ Dismiss for now</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  modal._alertId = alert._id || alert.id;

  // Identify logged in user
  let currentUserId = null;
  const token = getToken();
  if (token) {
    try {
      currentUserId = JSON.parse(atob(token.split('.')[1])).id;
    } catch (e) {}
  }
  const myRole = getRole();

  const alertTypeStr = alert.alertType === 'fall' 
    ? 'Fall Detected!' 
    : (alert.alertType === 'inactive' ? 'Inactivity Alert!' : 'Manual SOS Triggered!');

  // Resolve sender info and role
  const alertUser = (alert.userId && typeof alert.userId === 'object') ? alert.userId : {};
  const alertUserIdStr = alertUser._id || alertUser.id || (typeof alert.userId === 'string' ? alert.userId : '');
  const isMyAlert = currentUserId && (alertUserIdStr === currentUserId);
  const triggeredByRole = alert.triggeredByRole || (isMyAlert ? myRole : (myRole === 'caretaker' ? 'client' : 'caretaker'));

  let senderName = '';
  if (alert.triggeredByName && alert.triggeredByName !== 'Client' && alert.triggeredByName !== 'Caretaker') {
    senderName = alert.triggeredByName;
  } else if (alertUser.name) {
    senderName = alertUser.name;
  } else {
    senderName = (triggeredByRole === 'caretaker') ? 'Caretaker' : 'Client';
  }

  const titleEl = document.getElementById('emModalTitle');
  const descEl = document.getElementById('emModalDesc');
  const timeEl = document.getElementById('emModalTime');
  const locBtn = document.getElementById('emModalLocBtn');
  const callBtn = document.getElementById('emModalCallBtn');
  const tagEl = document.getElementById('emModalTag');
  const resolveBtn = document.getElementById('emModalResolveBtn');

  if (titleEl) titleEl.textContent = alertTypeStr;

  if (myRole === 'caretaker') {
    if (isMyAlert || triggeredByRole === 'caretaker') {
      // Caretaker initiated the SOS
      if (tagEl) tagEl.textContent = '🚨 EMERGENCY BROADCAST ACTIVE';
      if (descEl) descEl.innerHTML = `You initiated this emergency alert for your client and family. Immediate response signal is active.`;
      if (callBtn) callBtn.textContent = '📹 Call Client Now';
      if (resolveBtn) resolveBtn.textContent = '✅ Cancel SOS / Mark Resolved';
    } else {
      // Client initiated the SOS, Caretaker is responding
      if (tagEl) tagEl.textContent = '🚨 ACTIVE CLIENT EMERGENCY ALERT';
      if (descEl) descEl.innerHTML = `<strong>${senderName}</strong> triggered this alert and may need immediate assistance!`;
      if (callBtn) callBtn.textContent = (senderName && senderName !== 'Client') ? `📹 Call ${senderName} Now` : '📹 Call Client Now';
      if (resolveBtn) resolveBtn.textContent = '✅ Acknowledge & Mark Resolved';
    }
  } else {
    // Client view
    if (isMyAlert || triggeredByRole === 'client') {
      // Client initiated the SOS
      if (tagEl) tagEl.textContent = 'YOUR SOS ALERT IS ACTIVE';
      if (descEl) descEl.innerHTML = `Your SOS alert was sent to your caregiver and family. Stay calm, help is on the way!`;
      if (callBtn) callBtn.textContent = '📹 Call Caretaker Now';
      if (resolveBtn) resolveBtn.textContent = '✅ Cancel SOS / Mark Resolved';
    } else {
      // Caretaker initiated the SOS, Client is viewing
      if (tagEl) tagEl.textContent = '🚨 EMERGENCY ALERT FROM CAREGIVER';
      if (descEl) descEl.innerHTML = `<strong>${senderName} (Your Caregiver)</strong> initiated an emergency alert for you! Please connect immediately.`;
      if (callBtn) callBtn.textContent = '📹 Call Caretaker Now';
      if (resolveBtn) resolveBtn.textContent = '✅ Acknowledge & Mark Resolved';
    }
  }

  if (timeEl) {
    timeEl.textContent = `Triggered at: ${new Date(alert.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  }
  if (resolveBtn) {
    resolveBtn.disabled = false;
  }

  if (locBtn) {
    if (alert.latitude && alert.longitude) {
      locBtn.style.display = 'inline-flex';
      locBtn.href = `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`;
    } else {
      locBtn.style.display = 'none';
    }
  }

  // Update home dashboard banner if on home page
  updateHomeEmergencyBanner(alert, senderName, alertTypeStr);

  modal.style.setProperty('display', 'flex', 'important');
  if (!_sirenMuted) {
    startSiren();
  }
}

function hideActiveEmergencyModal(hideBanner = true) {
  const modal = document.getElementById('incomingEmergencyModal');
  if (modal) modal.style.setProperty('display', 'none', 'important');
  if (hideBanner) {
    const homeBanner = document.getElementById('homeEmergencyAlertBanner');
    if (homeBanner) homeBanner.style.display = 'none';
  }
  stopSiren();
}

function dismissEmergencyModal() {
  const modal = document.getElementById('incomingEmergencyModal');
  if (modal && modal._alertId) {
    _lastDismissedAlertId = modal._alertId;
    _lastDismissedAlertTime = Date.now();
    try {
      sessionStorage.setItem('dismissed_emergency_' + modal._alertId, Date.now().toString());
    } catch (e) {}
  }
  // Hide modal and silence siren, keep home banner active for quick access
  if (modal) modal.style.setProperty('display', 'none', 'important');
  stopSiren();
}

async function resolveEmergencyFromModal() {
  const modal = document.getElementById('incomingEmergencyModal');
  const alertId = modal && modal._alertId;
  if (!alertId) {
    hideActiveEmergencyModal(true);
    return;
  }

  const resolveBtn = document.getElementById('emModalResolveBtn');
  if (resolveBtn) {
    resolveBtn.disabled = true;
    resolveBtn.textContent = 'Resolving...';
  }

  try {
    await apiCall(`/emergency/alerts/${alertId}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ notes: 'Resolved from emergency alert popup' })
    });
    showToast('✅ Emergency alert resolved');
    try {
      sessionStorage.removeItem('dismissed_emergency_' + alertId);
    } catch (e) {}
    _lastDismissedAlertId = null;
    _currentActiveEmergencyAlert = null;
    hideActiveEmergencyModal(true);
    if (typeof loadAlertHistory === 'function') {
      loadAlertHistory();
    }
  } catch (err) {
    showToast(`⚠ Failed to resolve alert: ${err.message || ''}`, true);
    if (resolveBtn) {
      resolveBtn.disabled = false;
      resolveBtn.textContent = '✅ Acknowledge & Mark Resolved';
    }
  }
}

function initActiveEmergencyListener() {
  if (!getToken()) return;

  async function checkEmergencyAlerts() {
    try {
      const token = getToken();
      if (!token) return;

      const res = await fetch(`${API_BASE}/emergency/alerts?status=triggered&limit=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;

      const data = await res.json();
      const alerts = (data && data.data) || [];
      const activeAlert = alerts[0]; // Server already filtered status=triggered

      if (activeAlert) {
        const alertId = activeAlert._id || activeAlert.id;
        _currentActiveEmergencyAlert = activeAlert;

        // Check if user dismissed this alert in this browser session
        let isDismissed = false;
        try {
          const dismissedAt = sessionStorage.getItem('dismissed_emergency_' + alertId);
          if (dismissedAt) isDismissed = true;
        } catch (e) {}

        // Fallback in-memory check (5 minutes snooze)
        if (_lastDismissedAlertId === alertId && ((Date.now() - _lastDismissedAlertTime) < 300000)) {
          isDismissed = true;
        }

        if (!isDismissed) {
          showActiveEmergencyModal(activeAlert);
          return;
        } else {
          // If modal was dismissed, keep home banner visible
          let sender = activeAlert.triggeredByName || (activeAlert.userId && activeAlert.userId.name) || 'Family Member';
          let typeStr = activeAlert.alertType === 'fall' ? 'Fall Detected' : (activeAlert.alertType === 'inactive' ? 'Inactivity Alert' : 'Manual SOS');
          updateHomeEmergencyBanner(activeAlert, sender, typeStr);
          return;
        }
      }

      // If no active alert in database, reset state and hide all emergency UI
      _currentActiveEmergencyAlert = null;
      hideActiveEmergencyModal(true);
    } catch (e) {
      // Silently ignore background polling errors
    }
  }

  // Check every 1.5 seconds for instant reaction
  setInterval(checkEmergencyAlerts, 1500);
  checkEmergencyAlerts();
}
