let iframeConfig = null;

function isIframePayload(data) {
  return data != null
    && typeof data === 'object'
    && typeof data[IFRAME_FIELDS.openapi] === 'string'
    && data.type === undefined;
}

function decodeB64(b64) {
  return decodeURIComponent(escape(atob(b64)));
}

function encodeB64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

window.addEventListener('message', function(event) {
  if (!event || !event.data) return;
  if (!isIframePayload(event.data)) return;

  var history = event.data[IFRAME_FIELDS.history] || null;
  if (!history && Array.isArray(event.data.files)) {
    var match = event.data.files.find(function(f) { return f.filename === 'edc-config.json'; });
    if (match) history = match.content_in_base64;
  }

  iframeConfig = {
    openapi:           event.data[IFRAME_FIELDS.openapi],
    history:           history,
    apiQualityApiId:   event.data[IFRAME_FIELDS.apiQualityApiId] || null,
    apiQualityBranchId: event.data[IFRAME_FIELDS.apiQualityBranchId] || null,
    apiQualityOrg:     event.data[IFRAME_FIELDS.apiQualityOrg] || null
  };

  processIframePayload();
});

async function processIframePayload() {
  if (!iframeConfig || !iframeConfig.openapi) return;

  try {
    var text = decodeB64(iframeConfig.openapi);
    var isYaml = !text.trim().startsWith('{');
    var filename = isYaml ? 'openapi.yaml' : 'openapi.json';
    var blob = new Blob([text], { type: 'text/plain' });
    var file = new File([blob], filename);

    var uploadArea = document.getElementById('uploadArea');
    if (uploadArea) uploadArea.style.display = 'none';

    await handleFile(file);

    if (iframeConfig.history) {
      var historyText = decodeB64(iframeConfig.history);
      var historyBlob = new Blob([historyText], { type: 'application/json' });
      var historyFile = new File([historyBlob], 'history.json');
      await handleHistoryFile(historyFile);
    }
  } catch (err) {
    console.error('[iframe-bridge] Error processing payload:', err);
    var status = document.getElementById('uploadStatus');
    if (status) {
      status.style.display = 'block';
      status.className = 'alert alert-error';
      status.textContent = 'Error loading from APIQuality: ' + err.message;
    }
  }
}

function sendResultToParent(data) {
  if (window.parent && window.parent !== window) {
    var b64 = encodeB64(JSON.stringify(data));
    var files = [
      { filename: 'edc-config.json', content_in_base64: b64 }
    ];
    window.parent.postMessage({ files: files }, '*');
  }
}
