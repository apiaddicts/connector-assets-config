let parsedSpec = null;
let extractedOps = [];
let selectedLevel = 1;
let lastResults = null;
let loadedHistory = null;

/* ── Collapsible cards ── */
function toggleCard(btn) {
  const card = btn.closest('.card');
  card.classList.toggle('collapsed');
}

const uploadArea = document.getElementById('uploadArea');
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.style.borderColor = 'var(--primary)'; });
uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = ''; });
uploadArea.addEventListener('drop', e => { e.preventDefault(); uploadArea.style.borderColor = ''; if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });

async function handleFile(file) {
  if (!file) return;
  const text = await file.text();

  try {
    const resp = await fetch('/api/parse-openapi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, filename: file.name }),
    });
    if (!resp.ok) { const err = await resp.json(); throw new Error(err.error); }
    const data = await resp.json();

    parsedSpec = data;
    extractedOps = data.operations;
    if (typeof resetCdIdEdited === 'function') resetCdIdEdited();

    document.getElementById('uploadStatus').style.display = 'block';
    document.getElementById('uploadStatus').className = 'alert alert-success';
    document.getElementById('uploadStatus').textContent = t('upload_loaded').replace('{file}', file.name).replace('{count}', data.operations.length);
    document.getElementById('specSummary').style.display = 'block';
    document.getElementById('specTitle').textContent = data.title || '(untitled)';
    document.getElementById('specVersion').textContent = data.version || '?';
    document.getElementById('specOpsCount').textContent = data.operations.length;

    document.getElementById('f_apiName').value = data.title || '';
    document.getElementById('f_apiVersion').value = data.version || '';
    document.getElementById('f_description').value = data.description || '';
    const basePathEl = document.getElementById('f_basePath');
    basePathEl.value = data.basePath || '';
    if (data.basePath) {
      basePathEl.readOnly = true;
      basePathEl.classList.add('auto');
      showBasePathWarning(false);
    } else {
      basePathEl.readOnly = false;
      basePathEl.classList.remove('auto');
      basePathEl.placeholder = '/api/v1';
      showBasePathWarning(true);
    }
    if (data.license) document.getElementById('f_license').value = data.license;
    if (data.contact) document.getElementById('f_contact').value = data.contact;

    document.getElementById('btnNext1').disabled = false;
    renderOps();
  } catch (err) {
    document.getElementById('uploadStatus').style.display = 'block';
    document.getElementById('uploadStatus').className = 'alert alert-error';
    const friendlyMsg = getFriendlyUploadError(err.message, file.name);
    document.getElementById('uploadStatus').textContent = friendlyMsg;
  }
}

function showBasePathWarning(show) {
  const container = document.getElementById('f_basePath').parentElement;
  let warn = container.querySelector('.basepath-warn');
  if (show && !warn) {
    warn = document.createElement('div');
    warn.className = 'basepath-warn';
    warn.style.cssText = 'font-size:11px;color:#b45309;margin-top:4px';
    warn.textContent = t('basepath_empty_warn');
    container.appendChild(warn);
  } else if (!show && warn) {
    warn.remove();
  }
}

function getFriendlyUploadError(rawMsg, filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  const validExts = ['yaml', 'yml', 'json'];
  if (!validExts.includes(ext)) return t('upload_invalid_format');
  const technicalPatterns = [
    /unexpected token/i, /is not valid json/i, /bad indentation/i,
    /failed to parse/i, /yaml.*error/i, /syntaxerror/i,
  ];
  if (technicalPatterns.some(p => p.test(rawMsg))) return t('upload_invalid_openapi');
  return t('upload_invalid_openapi');
}

const historyArea = document.getElementById('historyUploadArea');
historyArea.addEventListener('dragover', e => { e.preventDefault(); historyArea.style.borderColor = 'var(--primary)'; });
historyArea.addEventListener('dragleave', () => { historyArea.style.borderColor = ''; });
historyArea.addEventListener('drop', e => { e.preventDefault(); historyArea.style.borderColor = ''; if (e.dataTransfer.files[0]) handleHistoryFile(e.dataTransfer.files[0]); });

async function handleHistoryFile(file) {
  if (!file) return;
  const statusEl = document.getElementById('historyStatus');
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.resources || !data.config) {
      throw new Error(currentLang === 'es' ? 'JSON no es un historial v\u00e1lido (falta resources/config)' : 'JSON is not a valid history file (missing resources/config)');
    }

    loadedHistory = data;

    const prevAssetIds = new Set((data.resources.assets || []).map(a => a.id));

    const cfg = data.config;
    document.getElementById('f_edcUrl').value = cfg.edcUrl || '';
    document.getElementById('f_edcApiKey').value = '';
    if (cfg.serviceBaseUrl) document.getElementById('f_serviceUrl').value = cfg.serviceBaseUrl;
    if (cfg.apiName) document.getElementById('f_apiName').value = cfg.apiName;
    if (cfg.apiVersion) document.getElementById('f_apiVersion').value = cfg.apiVersion;
    if (cfg.basePath) document.getElementById('f_basePath').value = cfg.basePath;
    if (cfg.description) document.getElementById('f_description').value = cfg.description;
    if (cfg.provider) {
      if (cfg.provider.did) document.getElementById('f_providerDid').value = cfg.provider.did;
      if (cfg.provider.legalName) document.getElementById('f_legalName').value = cfg.provider.legalName;
      if (cfg.provider.copyrightOwner) document.getElementById('f_copyright').value = cfg.provider.copyrightOwner;
      if (cfg.provider.licenseSpdx) document.getElementById('f_license').value = cfg.provider.licenseSpdx;
      if (cfg.provider.contactEmail) document.getElementById('f_contact').value = cfg.provider.contactEmail;
      if (cfg.provider.country) document.getElementById('f_country').value = cfg.provider.country;
      if (cfg.provider.headquarterCountry) document.getElementById('f_country').value = cfg.provider.headquarterCountry;
      if (cfg.provider.termsUrl) document.getElementById('f_termsUrl').value = cfg.provider.termsUrl;
      if (cfg.provider.termsHash) document.getElementById('f_termsHash').value = cfg.provider.termsHash;
      if (cfg.provider.legalAddressCountry) document.getElementById('f_legalAddressCountry').value = cfg.provider.legalAddressCountry;
      if (cfg.provider.legalRegistrationNumber) {
        document.getElementById('f_legalRegType').value = cfg.provider.legalRegistrationNumber.type || '';
        document.getElementById('f_legalRegValue').value = cfg.provider.legalRegistrationNumber.value || '';
      }
    }
    if (cfg.resource) {
      if (cfg.resource.containsPII !== undefined && cfg.resource.containsPII !== null) {
        const piiRadio = document.querySelector(`input[name="containsPII"][value="${cfg.resource.containsPII}"]`);
        if (piiRadio) piiRadio.checked = true;
      }
      if (cfg.resource.dataLocation) document.getElementById('f_dataLocation').value = cfg.resource.dataLocation;
    }
    if (cfg.catalog) {
      if (cfg.catalog.keywords) document.getElementById('f_keywords').value = cfg.catalog.keywords;
      if (cfg.catalog.language) document.getElementById('f_language').value = cfg.catalog.language;
      if (cfg.catalog.contentType) document.getElementById('f_contentType').value = cfg.catalog.contentType;
      if (cfg.catalog.creator) document.getElementById('f_creator').value = cfg.catalog.creator;
    }

    if (extractedOps.length) {
      const slug = (cfg.apiName || '').toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/^-|-$/g, '');
      const prefix = `${slug}-`;
      for (const op of extractedOps) {
        const assetId = `${prefix}${op.operationId}`;
        op._deployed = prevAssetIds.has(assetId);
      }
      renderOps();
    }

    const nAssets = (data.resources.assets || []).length;
    const nPolicies = (data.resources.accessPolicy ? 1 : 0) + (data.resources.contractPolicy ? 1 : 0);

    statusEl.style.display = 'block';
    statusEl.className = 'alert alert-success';
    statusEl.innerHTML = t('history_loaded')
      .replaceAll('{api}', cfg.apiName || '?')
      .replaceAll('{assets}', nAssets)
      .replaceAll('{policies}', nPolicies);

  } catch (err) {
    loadedHistory = null;
    statusEl.style.display = 'block';
    statusEl.className = 'alert alert-error';
    statusEl.textContent = t('upload_error').replace('{msg}', err.message);
  }
}

function clearHistory() {
  loadedHistory = null;
  document.getElementById('historyStatus').style.display = 'none';
  document.getElementById('historyFileInput').value = '';
  for (const op of extractedOps) delete op._deployed;
  renderOps();
}

function renderOps() {
  const c = document.getElementById('opsContainer');
  if (!extractedOps.length) { c.innerHTML = `<p style="color:var(--muted)">${t('ops_no_found')}</p>`; return; }

  let html = `<table class="ops-table"><thead><tr><th></th><th>${t('ops_th_method')}</th><th>${t('ops_th_path')}</th><th>${t('ops_th_opid')}</th><th>${t('ops_th_summary')}</th><th>${t('ops_th_status')}</th></tr></thead><tbody>`;
  extractedOps.forEach((op, i) => {
    const statusBadge = op._deployed
      ? (op.included ? `<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:#dbeafe;color:#1e40af">${t('ops_deployed')}</span>`
                     : `<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:#fee2e2;color:#991b1b">${t('ops_will_delete')}</span>`)
      : (op.included ? `<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:#dafbe1;color:#1a7f37">${t('ops_new')}</span>` : '');
    html += `<tr style="${op._deployed && !op.included ? 'background:#fff5f5' : ''}">
      <td><input type="checkbox" ${op.included ? 'checked' : ''} onchange="extractedOps[${i}].included=this.checked; renderOps()"></td>
      <td><span class="method method-${op.method}">${op.method}</span></td>
      <td style="font-family:monospace;font-size:12px">${op.path}</td>
      <td style="font-size:12px">${op.operationId}</td>
      <td style="font-size:11px;color:var(--muted)">${op.summary || ''}</td>
      <td>${statusBadge}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  c.innerHTML = html;
  if (typeof updateAssetsSummary === 'function') updateAssetsSummary();
}

function toggleAll(checked) {
  extractedOps.forEach(o => o.included = checked);
  renderOps();
}

function toggleAuthMode() {
  const mode = document.querySelector('input[name="authMode"]:checked').value;
  document.getElementById('authDirectFields').style.display = mode === 'direct' ? 'block' : 'none';
  document.getElementById('authVaultFields').style.display = mode === 'vault' ? 'block' : 'none';
  document.getElementById('authOAuth2Fields').style.display = mode === 'oauth2' ? 'block' : 'none';
  if (mode !== 'direct') { document.getElementById('f_authKey').value = ''; document.getElementById('f_authCode').value = ''; }
  if (mode !== 'vault') { document.getElementById('f_vaultAuthKey').value = ''; document.getElementById('f_secretName').value = ''; }
  if (mode !== 'oauth2') { document.getElementById('f_oauth2TokenUrl').value = ''; document.getElementById('f_oauth2ClientId').value = ''; document.getElementById('f_oauth2ClientSecretKey').value = ''; }
}

renderAllPolicy();
initValidation();
if (typeof initSoField === 'function') initSoField();

const savedLang = localStorage.getItem('gaiax-lang');
if (savedLang && savedLang !== currentLang) setLang(savedLang);
