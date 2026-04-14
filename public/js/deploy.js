function goStep(n) {
  if (n >= 2 && !parsedSpec) {
    showStepAlert(t('step_need_openapi'));
    return;
  }
  if (n >= 3 && !validateAllFields()) {
    showStepAlert(t('step_need_required'));
    return;
  }
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`panel${n}`).classList.add('active');
  document.querySelectorAll('.step').forEach((s, i) => {
    s.classList.remove('active');
    if (i + 1 < n) s.classList.add('done'); else s.classList.remove('done');
    if (i + 1 === n) s.classList.add('active');
  });
  if (n === 3) renderReview();
}

function showStepAlert(msg) {
  const existing = document.getElementById('stepAlertBanner');
  if (existing) existing.remove();
  const banner = document.createElement('div');
  banner.id = 'stepAlertBanner';
  banner.className = 'alert alert-warn';
  banner.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:999;box-shadow:0 4px 16px rgba(0,0,0,.15);max-width:500px;animation:fadeIn .3s';
  banner.textContent = msg;
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 4000);
}

function buildDeployPayload(extraFields) {
  const val = id => document.getElementById(id).value.trim() || undefined;
  return {
    connectorType: getConnectorType(),
    edcUrl: document.getElementById('f_edcUrl').value.trim().replace(/\/$/, ''),
    edcApiKey: document.getElementById('f_edcApiKey')?.value.trim() || '',
    serviceOfferingUrl: document.getElementById('f_serviceOfferingUrl')?.value.trim() || undefined,
    apiName: parsedSpec.title || 'unnamed-api',
    apiVersion: parsedSpec.version || '1.0.0',
    serviceBaseUrl: document.getElementById('f_serviceUrl').value.trim(),
    basePath: val('f_basePath') || parsedSpec.basePath || '',
    description: val('f_description'),
    accessPolicy: {
      level: policyState.access.level,
      constraints: policyState.access.constraints.filter(c => c.leftOperand && c.rightOperand),
      prohibitions: policyState.access.prohibitions,
      obligations: policyState.access.obligations,
    },
    contractPolicy: {
      level: policyState.contract.level,
      constraints: policyState.contract.constraints.filter(c => c.leftOperand && c.rightOperand),
      prohibitions: policyState.contract.prohibitions,
      obligations: policyState.contract.obligations,
    },
    operations: extractedOps,
    providerDid: val('f_providerDid'), legalName: val('f_legalName'),
    copyrightOwner: val('f_copyright'), licenseSpdx: val('f_license'),
    contactEmail: val('f_contact'), country: val('f_country'), termsUrl: val('f_termsUrl'),
    legalAddressCountry: val('f_legalAddressCountry'),
    legalRegType: val('f_legalRegType'), legalRegValue: val('f_legalRegValue'),
    termsHash: val('f_termsHash'),
    containsPII: document.querySelector('input[name="containsPII"]:checked')?.value === 'true',
    dataLocation: document.getElementById('f_dataLocation').value || undefined,
    keywords: val('f_keywords'), language: document.getElementById('f_language').value || undefined,
    contentType: val('f_contentType'), creator: val('f_creator'),
    authMode: document.querySelector('input[name="authMode"]:checked').value,
    authKey: val('f_authKey'), authCode: val('f_authCode'),
    vaultAuthKey: val('f_vaultAuthKey'), secretName: val('f_secretName'),
    oauth2TokenUrl: val('f_oauth2TokenUrl'), oauth2ClientId: val('f_oauth2ClientId'),
    oauth2ClientSecretKey: val('f_oauth2ClientSecretKey'),
    contractDefId: document.getElementById('f_contractDefId')?.value.trim() || undefined,
    transferFormat: document.getElementById('f_transferFormat')?.value || undefined,
    history: loadedHistory || undefined,
    ...extraFields,
  };
}

const FINGERPRINT_KEY = 'gaiax-deploy-fingerprint';

function buildFingerprint(payload) {
  const ops = (payload.operations || []).map(o => ({
    operationId: o.operationId, method: o.method, path: o.path, included: o.included,
  }));
  const common = {
    connectorType: payload.connectorType,
    edcUrl: payload.edcUrl,
    apiName: payload.apiName,
    apiVersion: payload.apiVersion,
    serviceBaseUrl: payload.serviceBaseUrl,
    basePath: payload.basePath,
    description: payload.description,
    contractPolicy: payload.contractPolicy,
    operations: ops,
    creator: payload.creator,
  };
  if (payload.connectorType === 'rainbow') {
    return JSON.stringify({ ...common, transferFormat: payload.transferFormat });
  }
  return JSON.stringify({
    ...common,
    accessPolicy: payload.accessPolicy,
    providerDid: payload.providerDid, legalName: payload.legalName,
    copyrightOwner: payload.copyrightOwner, licenseSpdx: payload.licenseSpdx,
    contactEmail: payload.contactEmail, country: payload.country, termsUrl: payload.termsUrl,
    legalAddressCountry: payload.legalAddressCountry,
    legalRegType: payload.legalRegType, legalRegValue: payload.legalRegValue,
    termsHash: payload.termsHash, containsPII: payload.containsPII,
    dataLocation: payload.dataLocation,
    keywords: payload.keywords, language: payload.language,
    contentType: payload.contentType,
    authMode: payload.authMode, authKey: payload.authKey, authCode: payload.authCode,
    vaultAuthKey: payload.vaultAuthKey, secretName: payload.secretName,
    oauth2TokenUrl: payload.oauth2TokenUrl, oauth2ClientId: payload.oauth2ClientId,
    oauth2ClientSecretKey: payload.oauth2ClientSecretKey,
    contractDefId: payload.contractDefId,
  });
}

function saveFingerprint(payload) {
  try { sessionStorage.setItem(FINGERPRINT_KEY, buildFingerprint(payload)); } catch { /* ignore */ }
}

function hasChangedSinceLastDeploy(payload) {
  try {
    const last = sessionStorage.getItem(FINGERPRINT_KEY);
    if (!last) return true;
    return last !== buildFingerprint(payload);
  } catch { return true; }
}

async function sendDeploy(payload) {
  const resp = await fetch('/api/create-edc-resources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { data: await resp.json(), status: resp.status };
}

function buildDiffHtml(diff) {
  if (!diff?.hasChanges) {
    return `<div style="font-size:12px;color:var(--muted);padding:8px;background:#f6f8fa;border-radius:4px">${t('conflict_no_changes')}</div>`;
  }

  let html = '<div style="font-size:12px;margin-bottom:16px">';

  if (diff.policies.access.changed) {
    html += `<div style="padding:4px 0"><span style="color:#92400e">&#9654;</span> <strong>Access Policy:</strong> Level ${diff.policies.access.current} &rarr; Level ${diff.policies.access.desired}</div>`;
  }
  if (diff.policies.contract.changed) {
    html += `<div style="padding:4px 0"><span style="color:#92400e">&#9654;</span> <strong>Contract Policy:</strong> Level ${diff.policies.contract.current} &rarr; Level ${diff.policies.contract.desired}</div>`;
  }

  for (const id of diff.assets.added) {
    html += `<div style="padding:2px 0"><span style="color:var(--success)">+ ${id}</span></div>`;
  }
  for (const id of diff.assets.removed) {
    html += `<div style="padding:2px 0"><span style="color:var(--danger)">&minus; ${id}</span></div>`;
  }
  if (diff.assets.kept.length) {
    html += `<div style="padding:2px 0;color:var(--muted)">${diff.assets.kept.length} assets ${t('conflict_unchanged')}</div>`;
  }

  html += '</div>';
  return html;
}

function showConflictDialog(conflictData, payload) {
  const c = document.getElementById('resultsContainer');
  c.style.display = 'block';
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('resultButtons').style.display = 'none';

  const diffHtml = buildDiffHtml(conflictData.diff);

  c.innerHTML = `
    <div class="alert alert-warn" style="border-left:4px solid #f59e0b">
      <strong>&#9888; ${t('conflict_title')}</strong>
    </div>
    <div class="card" style="margin-top:12px">
      <p style="margin-bottom:12px">${t('conflict_body')}</p>
      <div style="font-size:12px;color:var(--muted);margin-bottom:12px">
        <strong>Contract Definition:</strong> <code>${conflictData.contractDefId}</code><br>
        <strong>Access Policy:</strong> <code>${conflictData.accessPolicyId}</code><br>
        <strong>Contract Policy:</strong> <code>${conflictData.contractPolicyId}</code>
      </div>
      <h4 style="margin:12px 0 8px;font-size:13px">${t('conflict_changes_title')}</h4>
      ${diffHtml}
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
        <button class="btn" onclick="resolveConflict('force-replace')" style="background:var(--danger);color:#fff;flex:1">
          &#9888; ${t('conflict_force_replace')}
        </button>
        <button class="btn" onclick="resolveConflict('create-new')" style="background:#f59e0b;color:#fff;flex:1">
          &#10010; ${t('conflict_create_new')}
        </button>
        <button class="btn" onclick="resolveConflict('cancel')" style="background:var(--muted);color:#fff;flex:1">
          &#10005; ${t('conflict_cancel')}
        </button>
      </div>
      <div style="margin-top:12px;font-size:11px;color:var(--muted)">
        <details><summary style="cursor:pointer">${t('conflict_details')}</summary>
          <p style="margin-top:8px"><strong>${t('conflict_opt_replace')}:</strong> ${t('conflict_opt_replace_desc')}</p>
          <p><strong>${t('conflict_opt_new')}:</strong> ${t('conflict_opt_new_desc')}</p>
          <p><strong>${t('conflict_opt_cancel')}:</strong> ${t('conflict_opt_cancel_desc')}</p>
        </details>
      </div>
    </div>`;

  globalThis._conflictPayload = payload;
}

async function resolveConflict(resolution) {
  if (resolution === 'cancel') {
    goStep(3);
    return;
  }

  const payload = globalThis._conflictPayload;
  if (!payload) return;
  payload.conflictResolution = resolution;

  document.getElementById('resultsContainer').style.display = 'none';
  document.getElementById('loadingState').style.display = 'block';

  try {
    const { data } = await sendDeploy(payload);
    lastResults = data;
    saveFingerprint(payload);
    if (data.success) sendResultToParent(data);
    document.getElementById('loadingState').style.display = 'none';
    renderResults(data);
  } catch (err) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('resultsContainer').style.display = 'block';
    document.getElementById('resultsContainer').innerHTML = `<div class="alert alert-error">${t('conn_error')} ${err.message}</div>`;
    document.getElementById('resultButtons').style.display = 'flex';
  }
}

function showPolicyError(data) {
  goStep(2);

  let rejectedHtml = '';
  for (const [label, p] of [['Access Policy', data.accessPolicy], ['Contract Policy', data.contractPolicy]]) {
    if (p?.result?.status === 'error') {
      const errMsg = p.result.error || `HTTP ${p.result.httpCode}` || 'unknown';
      rejectedHtml += `<div style="margin:6px 0;padding:8px;background:#fee2e2;border-radius:4px;font-size:12px">
        <strong>${t('policy_error_rejected')}</strong> ${label} (Level ${p.level || 'Custom'}) — <code>${p.id}</code>
        <div style="margin-top:4px;color:var(--danger);font-size:11px">EDC response: ${errMsg}</div>
      </div>`;
    }
  }

  const panel = document.getElementById('panel2');
  const existingBanner = document.getElementById('policyErrorBanner');
  if (existingBanner) existingBanner.remove();

  const banner = document.createElement('div');
  banner.id = 'policyErrorBanner';
  banner.innerHTML = `
    <div class="alert alert-error" style="border-left:4px solid var(--danger);margin-bottom:16px">
      <strong>${t('policy_error_title')}</strong>
      <p style="margin:8px 0;font-size:13px">${t('policy_error_body')}</p>
      ${rejectedHtml}
      <div style="margin-top:12px">
        <strong>${t('policy_error_supported')}</strong>
        <ul style="margin:4px 0 0 16px;font-size:12px">${t('policy_error_supported_list')}</ul>
      </div>
      <div style="margin-top:12px">
        <strong style="color:var(--danger)">${t('policy_error_not_supported')}</strong>
        <ul style="margin:4px 0 0 16px;font-size:12px">${t('policy_error_not_supported_list')}</ul>
      </div>
      <p style="margin-top:12px;font-size:13px;font-weight:600">${t('policy_error_fix')}</p>
    </div>`;
  panel.insertBefore(banner, panel.firstChild);
}

async function deploy() {
  const payload = buildDeployPayload();

  if (!validateAllFields()) { goStep(2); return; }

  const included = extractedOps.filter(o => o.included);
  if (!included.length) { alert(t('alert_select_op')); return; }

  if (!hasChangedSinceLastDeploy(payload)) {
    goStep(4);
    document.getElementById('loadingState').style.display = 'none';
    const c = document.getElementById('resultsContainer');
    c.style.display = 'block';
    c.innerHTML = `<div class="alert alert-info" style="border-left:4px solid var(--primary)">
      <strong>${t('no_changes_title')}</strong>
      <p style="margin:6px 0 0;font-size:13px">${t('no_changes_body')}</p>
    </div>`;
    document.getElementById('resultButtons').style.display = 'flex';
    return;
  }

  const prevBanner = document.getElementById('policyErrorBanner');
  if (prevBanner) prevBanner.remove();

  goStep(4);
  document.getElementById('loadingState').style.display = 'block';
  document.getElementById('resultsContainer').style.display = 'none';
  document.getElementById('resultButtons').style.display = 'none';

  try {
    const { data, status } = await sendDeploy(payload);

    if (status === 502 && data.rainbowError) {
      document.getElementById('loadingState').style.display = 'none';
      const c = document.getElementById('resultsContainer');
      c.style.display = 'block';
      c.innerHTML = `<div class="alert alert-error"><strong>${t('rainbow_deploy_error')}</strong><br>${t('rb_phase')}: ${data.phase || '—'}<br>${data.error || ''}</div>`;
      document.getElementById('resultButtons').style.display = 'flex';
      return;
    }

    if (status === 409 && data.conflict) {
      showConflictDialog(data, payload);
      return;
    }

    if (status === 422 && data.policyError) {
      document.getElementById('loadingState').style.display = 'none';
      showPolicyError(data);
      return;
    }

    lastResults = data;
    saveFingerprint(payload);
    if (data.success) sendResultToParent(data);
    document.getElementById('loadingState').style.display = 'none';
    renderResults(data);
  } catch (err) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('resultsContainer').style.display = 'block';
    document.getElementById('resultsContainer').innerHTML = `<div class="alert alert-error">${t('conn_error')} ${err.message}</div>`;
    document.getElementById('resultButtons').style.display = 'flex';
  }
}

function renderResults(data) {
  if (data.connectorType === 'rainbow') {
    renderRainbowResults(data);
    return;
  }

  const c = document.getElementById('resultsContainer');
  c.style.display = 'block';
  document.getElementById('resultButtons').style.display = 'flex';

  if (data.error) {
    c.innerHTML = `<div class="alert alert-error">${data.error}</div>`;
    return;
  }

  loadedHistory = data;

  const s = data.summary;
  const cfg = data.config;
  const res = data.resources;
  const successClass = data.success ? 'alert-success' : 'alert-warn';
  const statusText = data.success ? t('deploy_success') : t('deploy_issues');

  function statusIcon(st) {
    if (st === 'created')  return ['&#10003;', 'var(--success)', '#dafbe1'];
    if (st === 'updated')  return ['&#8635;', '#1e40af', '#dbeafe'];
    if (st === 'exists' || st === 'skipped') return ['&#9654;', 'var(--muted)', '#f6f8fa'];
    if (st === 'deleted')  return ['&#10005;', '#92400e', '#fef3c7'];
    if (st === 'not_found') return ['&#8709;', 'var(--muted)', '#f6f8fa'];
    if (st === 'locked')   return ['&#128274;', '#92400e', '#fef3c7'];
    return ['&#10007;', 'var(--danger)', '#fee2e2'];
  }

  function statusLabel(st) {
    const labels = {
      created: { es: 'creado', en: 'created' },
      updated: { es: 'actualizado', en: 'updated' },
      exists:  { es: 'sin cambios', en: 'unchanged' },
      skipped: { es: 'sin cambios', en: 'unchanged' },
      deleted: { es: 'eliminado', en: 'deleted' },
      not_found: { es: 'no encontrado', en: 'not found' },
      locked:  { es: 'bloqueado (contrato activo)', en: 'locked (active agreement)' },
      error:   { es: 'error', en: 'error' },
    };
    return (labels[st] || labels.error)[currentLang] || st;
  }

  let html = `<div class="alert ${successClass}"><strong>${statusText}</strong></div>`;

  if (s.hasActiveAgreement) {
    html += `<div class="alert alert-warn" style="border-left:4px solid #f59e0b;margin-top:8px">
      <strong>&#9888; ${t('warn_active_agreement_title')}</strong><br>
      ${t('warn_active_agreement_body')}
    </div>`;
  }

  html += `<div class="result-summary">
    <h3>${t('res_config')}</h3>
    <div class="result-stat"><strong>${t('res_timestamp')}</strong> ${data.timestamp}</div>
    <div class="result-stat"><strong>${t('res_api')}</strong> ${s.api}</div>
    <div class="result-stat"><strong>${t('res_edc')}</strong> ${cfg.edcUrl}</div>
    <div class="result-stat"><strong>${t('res_upstream')}</strong> ${cfg.fullUpstreamUrl}</div>
    <div class="result-stat"><strong>Access Policy:</strong> ${s.accessPolicy} (Level ${cfg.accessPolicy?.level || 'Custom'})</div>
    <div class="result-stat"><strong>Contract Policy:</strong> ${s.contractPolicy} (Level ${cfg.contractPolicy?.level || 'Custom'})</div>`;
  if (cfg.provider?.legalName)   html += `<div class="result-stat"><strong>${t('res_provider')}</strong> ${cfg.provider.legalName}</div>`;
  if (cfg.provider?.did)         html += `<div class="result-stat"><strong>${t('res_did')}</strong> ${cfg.provider.did}</div>`;
  if (cfg.provider?.licenseSpdx) html += `<div class="result-stat"><strong>${t('res_license')}</strong> ${cfg.provider.licenseSpdx}</div>`;
  if (cfg.provider?.headquarterCountry) html += `<div class="result-stat"><strong>${t('res_headquarter_country')}</strong> ${cfg.provider.headquarterCountry}</div>`;
  if (cfg.provider?.legalAddressCountry) html += `<div class="result-stat"><strong>${t('res_legal_address')}</strong> ${cfg.provider.legalAddressCountry}</div>`;
  if (cfg.provider?.legalRegistrationNumber) html += `<div class="result-stat"><strong>${t('res_registration')}</strong> ${cfg.provider.legalRegistrationNumber.type}: ${cfg.provider.legalRegistrationNumber.value}</div>`;
  if (cfg.provider?.termsHash) html += `<div class="result-stat"><strong>${t('res_terms_hash')}</strong> <code style="font-size:10px">${cfg.provider.termsHash.slice(0, 16)}...</code></div>`;
  if (cfg.resource) {
    html += `<div class="result-stat"><strong>${t('res_contains_pii')}</strong> ${cfg.resource.containsPII ? t('res_pii_yes') : t('res_pii_no')}</div>`;
    if (cfg.resource.dataLocation) html += `<div class="result-stat"><strong>${t('res_data_location')}</strong> ${cfg.resource.dataLocation}</div>`;
  }
  html += `</div>`;

  html += `<div class="result-summary" style="margin-top:12px">
    <h3>${t('res_summary')}</h3>
    <div class="result-stat"><strong>${t('res_assets_created')}</strong> <span style="color:var(--success);font-weight:600">${s.assetsCreated || 0}</span></div>
    <div class="result-stat"><strong>${t('res_assets_updated')}</strong> <span style="color:#1e40af;font-weight:600">${s.assetsUpdated || 0}</span></div>
    <div class="result-stat"><strong>${t('res_assets_skipped')}</strong> <span style="color:var(--muted)">${s.assetsSkipped || 0}</span></div>
    <div class="result-stat"><strong>${t('res_assets_deleted')}</strong> <span style="color:#92400e;font-weight:600">${s.assetsDeleted || 0}</span></div>
    <div class="result-stat"><strong>${t('res_assets_failed')}</strong> <span style="color:var(--danger);font-weight:600">${s.assetsFailed || 0}</span></div>
    <div class="result-stat"><strong>${t('res_contract_def')}</strong> ${statusLabel(s.contractDefinition)}</div>
    ${data.savedTo ? `<div class="result-stat"><strong>${t('res_saved_to')}</strong> output/${data.savedTo}</div>` : ''}
  </div>`;

  html += `<div class="card" style="margin-top:16px"><h3>${t('res_policy')}</h3>`;
  for (const [label, p] of [['Access Policy', res.accessPolicy], ['Contract Policy', res.contractPolicy]]) {
    if (!p) continue;
    const [pIcon, pColor, pBg] = statusIcon(p.result.status);
    html += `<div class="result-item" style="margin-bottom:4px">
      <span class="result-icon" style="color:${pColor}">${pIcon}</span>
      <strong>${label}:</strong> ${p.id} — Level ${p.level || 'Custom'}
      <span style="font-size:10px;padding:1px 6px;border-radius:8px;background:${pBg};color:${pColor};margin-left:8px">${statusLabel(p.result.status)}</span>
    </div>`;
    html += `<details style="margin-bottom:8px;font-size:11px"><summary style="cursor:pointer;color:var(--muted)">${t('res_view_payload')} — ${label}</summary><pre style="background:#f6f8fa;padding:10px;border-radius:4px;overflow-x:auto;margin-top:6px;font-size:11px">${JSON.stringify(p.payload, null, 2)}</pre></details>`;
  }
  html += '</div>';

  html += `<div class="card"><h3>${t('res_assets')}</h3>`;
  for (const a of res.assets) {
    const [aIcon, aColor, aBg] = statusIcon(a.result.status);
    html += `<div class="result-item">
      <span class="result-icon" style="color:${aColor}">${aIcon}</span>
      <span class="method method-${a.method}" style="font-size:10px">${a.method}</span>
      <span style="font-family:monospace;font-size:12px">${a.path}</span>
      <span style="font-size:10px;padding:1px 6px;border-radius:8px;background:${aBg};color:${aColor};margin-left:auto">${statusLabel(a.result.status)}</span>
    </div>`;
  }
  if (res.assets.length > 0) {
    html += `<details style="margin-top:8px;font-size:11px"><summary style="cursor:pointer;color:var(--muted)">${t('res_view_assets')} (${res.assets.length})</summary>`;
    for (const a of res.assets) {
      html += `<div style="margin-top:6px"><strong style="font-size:11px">${a.method} ${a.path}</strong> (${a.id})</div><pre style="background:#f6f8fa;padding:8px;border-radius:4px;overflow-x:auto;font-size:10px">${JSON.stringify(a.payload, null, 2)}</pre>`;
    }
    html += '</details>';
  }
  html += '</div>';

  const deletedAssets = res.deletedAssets || [];
  if (deletedAssets.length > 0) {
    html += `<div class="card" style="border-color:#fbbf24"><h3 style="color:#92400e">${t('res_deleted_assets')}</h3>`;
    for (const da of deletedAssets) {
      const [dIcon, dColor, dBg] = statusIcon(da.result.status);
      html += `<div class="result-item">
        <span class="result-icon" style="color:${dColor}">${dIcon}</span>
        <span style="font-family:monospace;font-size:12px">${da.id}</span>
        <span style="font-size:10px;padding:1px 6px;border-radius:8px;background:${dBg};color:${dColor};margin-left:auto">${statusLabel(da.result.status)}</span>
      </div>`;
    }
    html += '</div>';
  }

  const cd = res.contractDefinition;
  const [cdIcon, cdColor, cdBg] = statusIcon(cd.result.status);
  html += `<div class="card"><h3>${t('res_contract')}</h3>`;
  if (cd.lockedPreviousId) {
    html += `<div class="result-item" style="margin-bottom:6px">
      <span class="result-icon" style="color:#92400e">&#128274;</span>
      <strong>${cd.lockedPreviousId}</strong>
      <span style="font-size:10px;padding:1px 6px;border-radius:8px;background:#fef3c7;color:#92400e;margin-left:8px">${statusLabel('locked')}</span>
    </div>
    <div style="font-size:11px;color:#92400e;margin:0 0 12px 28px">${t('warn_cd_locked_reuse')}</div>`;
  }
  html += `<div class="result-item">
      <span class="result-icon" style="color:${cdColor}">${cdIcon}</span>
      <strong>${cd.id}</strong> — ${cd.assetIds.length} assets
      <span style="font-size:10px;padding:1px 6px;border-radius:8px;background:${cdBg};color:${cdColor};margin-left:8px">${statusLabel(cd.result.status)}</span>
    </div>
    <div style="font-size:11px;color:var(--muted);margin:4px 0 4px 28px">accessPolicyId: <code>${cd.accessPolicyId}</code> &nbsp;|&nbsp; contractPolicyId: <code>${cd.contractPolicyId}</code></div>
    <details style="margin-top:8px;font-size:11px"><summary style="cursor:pointer;color:var(--muted)">${t('res_view_payload')}</summary><pre style="background:#f6f8fa;padding:10px;border-radius:4px;overflow-x:auto;margin-top:6px;font-size:11px">${JSON.stringify(cd.payload, null, 2)}</pre></details>
  </div>`;

  c.innerHTML = html;
}

function downloadResults() {
  if (!lastResults) return;
  const fallback = lastResults.connectorType === 'rainbow' ? 'rainbow-config' : 'edc-config';
  const name = (lastResults.config?.apiName || fallback).toLowerCase().replaceAll(/[^a-z0-9]+/g, '-');
  const blob = new Blob([JSON.stringify(lastResults, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}-gaiax-config.json`;
  a.click();
}
