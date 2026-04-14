/**
 * UI actions: section toggling, form clear, preview/download, dynamic lists.
 * Depends on: utils.js, validation.js, config-builder.js, app.js (state)
 */

function toggleSection(header) {
  var s = header.parentElement;
  s.classList.toggle('open');
  header.querySelector('.section-toggle').textContent = s.classList.contains('open') ? '\u25BE' : '\u25B8';
}

function clearForm() {
  if (!confirm('Clear all fields?')) return;

  document.querySelectorAll('input:not([type=file]),textarea,select').forEach(function(el) {
    if (el.type === 'checkbox') el.checked = false;
    else el.value = '';
    el.classList.remove('autofilled', 'error');
  });

  // Restore defaults
  document.getElementById('f_contentType').value = 'application/json';
  document.getElementById('f_edcProtocol').value = 'HttpData';
  document.getElementById('f_contractStatus').value = 'Active';

  // Reset state
  parsedSpec = null;
  extractedOps = [];

  // Reset policy mode to preset
  setPolicyMode('preset');

  // Reset UI elements
  document.getElementById('uploadStatus').style.display = 'none';
  document.getElementById('summaryPanel').style.display = 'none';
  document.getElementById('operationsTable').innerHTML =
    '<p style="color:var(--muted);font-size:13px">Upload an OpenAPI file to see operations.</p>';
  document.getElementById('swPoliciesList').innerHTML = '';
  document.getElementById('billingTiersList').innerHTML = '';
}

function validateAndPreview() {
  if (!validate()) {
    alert('Fix highlighted required fields.');
    return;
  }
  var cfg;
  try { cfg = buildConfig(); } catch (e) { alert('Error building config: ' + e.message); return; }
  document.getElementById('previewContent').textContent = JSON.stringify(cfg, null, 2);
  document.getElementById('previewModal').style.display = 'block';
}

function downloadConfig() {
  if (!validate()) {
    alert('Fix highlighted required fields.');
    return;
  }
  var cfg;
  try { cfg = buildConfig(); } catch (e) { alert('Error: ' + e.message); return; }
  var name = slugify((cfg.softwareResource && cfg.softwareResource.name) || 'gaiax-config');
  var blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name + '-gaiax-config.json';
  a.click();

  // Send result to parent iframe (APIQuality) if embedded
  sendResultToParent(cfg);
}

/* ── Dynamic lists ───────────────────────────────────────────────── */

function addSwPolicy() {
  var list = document.getElementById('swPoliciesList');
  var item = document.createElement('div');
  item.className = 'dynamic-item';
  item.innerHTML =
    '<input type="text" placeholder="e.g. Permission: Licensed users may call API endpoints for production workloads." />' +
    '<button class="rm-btn" onclick="this.parentElement.remove()">\u00D7</button>';
  list.appendChild(item);
}

function addBillingTier() {
  var list = document.getElementById('billingTiersList');
  var idx = list.children.length;
  var div = document.createElement('div');
  div.style.cssText = 'border:1px solid var(--border);border-radius:var(--radius);padding:12px;margin-bottom:10px';
  div.innerHTML =
    '<div style="display:flex;justify-content:space-between;margin-bottom:10px">' +
      '<strong style="font-size:12px">Tier ' + (idx + 1) + '</strong>' +
      '<button style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:14px" onclick="this.closest(\'div\').remove()">\u00D7 Remove</button>' +
    '</div>' +
    '<div class="field-row">' +
      '<div class="field"><div class="field-header"><label>Tier Name</label></div><input type="text" id="tier_' + idx + '_name" placeholder="Research" /></div>' +
      '<div class="field"><div class="field-header"><label>Price</label></div><input type="number" id="tier_' + idx + '_price" placeholder="0" min="0" /></div>' +
    '</div>' +
    '<div class="field-row">' +
      '<div class="field"><div class="field-header"><label>Currency</label></div><input type="text" id="tier_' + idx + '_currency" placeholder="EUR" maxlength="3" /></div>' +
      '<div class="field"><div class="field-header"><label>Requests/Month Limit</label></div><input type="number" id="tier_' + idx + '_limit" placeholder="100000" /></div>' +
    '</div>';
  list.appendChild(div);
}
