/**
 * Application entry point: global state + initialization.
 * Loaded last — all other modules must be loaded before this.
 */

// ── Global state (shared across all modules) ────────────────────────
var parsedSpec = null;
var extractedOps = [];
var currentPolicyMode = 'preset'; // 'preset' | 'clone' | 'custom'

// ── Initialization ──────────────────────────────────────────────────
window.addEventListener('load', function() {
  // Set default values
  var now = new Date();
  now.setSeconds(0, 0);
  document.getElementById('f_issuanceDate').value = now.toISOString().slice(0, 16);
  document.getElementById('f_contentType').value = 'application/json';
  document.getElementById('f_trustFrameworkVersion').value = '24.04';

  // Initialize subsystems
  attachInlineValidation();
  onPresetChange();
  initUpload();
  initIframeBridge();
});
