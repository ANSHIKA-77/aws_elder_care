/* ═══════════════════════════════════════════════════
   Elder Care — Frontend API Configuration
   
   LOCAL DEV:  API_BASE points to local Express server
   PRODUCTION: API_BASE points to AWS API Gateway URL
   
   After deploying with deploy.ps1, replace the value
   of PRODUCTION_API_URL with your real API Gateway URL
   e.g. https://abc123xyz.execute-api.us-east-1.amazonaws.com
═══════════════════════════════════════════════════ */

(function () {
    // Detect environment by hostname
    const isLocalhost =
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1';

    // ── AWS API Gateway URL (deployed ap-south-1) ─────────────
    const PRODUCTION_API_URL = 'https://b3381pfxb0.execute-api.ap-south-1.amazonaws.com';
    // ──────────────────────────────────────────────────────────

    window.APP_CONFIG = {
        API_BASE: isLocalhost
            ? '/api/v1'                             // local Express server
            : PRODUCTION_API_URL + '/api/v1'        // AWS API Gateway
    };
})();
