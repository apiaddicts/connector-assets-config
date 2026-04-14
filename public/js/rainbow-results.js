function statusIcon(st) {
  if (st === 'created')   return ['&#10003;', 'var(--success)', '#dafbe1'];
  if (st === 'updated')   return ['&#8635;', '#1e40af', '#dbeafe'];
  if (st === 'exists' || st === 'skipped') return ['&#9654;', 'var(--muted)', '#f6f8fa'];
  if (st === 'deleted')   return ['&#10005;', '#92400e', '#fef3c7'];
  if (st === 'not_found') return ['&#8709;', 'var(--muted)', '#f6f8fa'];
  return ['&#10007;', 'var(--danger)', '#fee2e2'];
}

function rbStatusLabel(st) {
  const labels = {
    created: { es: 'creado', en: 'created' },
    updated: { es: 'actualizado', en: 'updated' },
    exists:  { es: 'sin cambios', en: 'unchanged' },
    deleted: { es: 'eliminado', en: 'deleted' },
    error:   { es: 'error', en: 'error' },
  };
  return (labels[st] || labels.error)[currentLang] || st;
}

function renderRainbowResults(data) {
  const c = document.getElementById('resultsContainer');
  c.style.display = 'block';
  document.getElementById('resultButtons').style.display = 'flex';

  if (data.error || data.rainbowError) {
    c.innerHTML = `<div class="alert alert-error">${data.error || t('rainbow_deploy_error')}</div>`;
    return;
  }

  loadedHistory = data;

  const s = data.summary;
  const cfg = data.config;
  const res = data.resources;
  const successClass = data.success ? 'alert-success' : 'alert-warn';
  const statusText = data.success ? t('deploy_success') : t('deploy_issues');

  let html = `<div class="alert ${successClass}"><strong>${statusText}</strong></div>`;

  html += `<div class="result-summary">
    <h3>${t('res_config')}</h3>
    <div class="result-stat"><strong>${t('res_timestamp')}</strong> ${data.timestamp}</div>
    <div class="result-stat"><strong>${t('res_api')}</strong> ${s.api}</div>
    <div class="result-stat"><strong>${t('rb_connector')}</strong> ${cfg.connectorUrl}</div>
    <div class="result-stat"><strong>${t('res_upstream')}</strong> ${cfg.fullUpstreamUrl}</div>
    <div class="result-stat"><strong>${t('rb_policy_level')}</strong> Level ${cfg.policy?.level || 'Custom'}</div>`;
  if (cfg.provider?.legalName)   html += `<div class="result-stat"><strong>${t('res_provider')}</strong> ${cfg.provider.legalName}</div>`;
  if (cfg.provider?.did)         html += `<div class="result-stat"><strong>${t('res_did')}</strong> ${cfg.provider.did}</div>`;
  html += `</div>`;

  html += `<div class="result-summary" style="margin-top:12px">
    <h3>${t('rb_summary')}</h3>
    <div class="result-stat"><strong>${t('rb_catalog')}</strong> ${rbStatusLabel(s.catalog)}</div>
    <div class="result-stat"><strong>${t('rb_data_service')}</strong> ${rbStatusLabel(s.dataService)}</div>
    <div class="result-stat"><strong>${t('rb_datasets_created')}</strong> <span style="color:var(--success);font-weight:600">${s.datasetsCreated || 0}</span></div>
    ${s.datasetsUpdated ? `<div class="result-stat"><strong>${t('rb_datasets_updated')}</strong> <span style="color:#1e40af;font-weight:600">${s.datasetsUpdated}</span></div>` : ''}
    ${s.datasetsDeleted ? `<div class="result-stat"><strong>${t('rb_datasets_deleted')}</strong> <span style="color:#92400e;font-weight:600">${s.datasetsDeleted}</span></div>` : ''}
    <div class="result-stat"><strong>${t('rb_datasets_failed')}</strong> <span style="color:var(--danger);font-weight:600">${s.datasetsFailed || 0}</span></div>
    <div class="result-stat"><strong>${t('rb_distributions')}</strong> <span style="color:var(--success);font-weight:600">${(s.distributionsCreated || 0) + (s.distributionsUpdated || 0)}</span></div>
    <div class="result-stat"><strong>${t('rb_policies_attached')}</strong> <span style="color:var(--success);font-weight:600">${s.policiesAttached || 0}</span></div>
    ${data.savedTo ? `<div class="result-stat"><strong>${t('res_saved_to')}</strong> output/${data.savedTo}</div>` : ''}
  </div>`;

  const [catIcon, catColor, catBg] = statusIcon(res.catalog?.result?.status);
  html += `<div class="card" style="margin-top:16px">
    <h3>${t('rb_catalog_detail')}</h3>
    <div class="result-item">
      <span class="result-icon" style="color:${catColor}">${catIcon}</span>
      <strong>Catalog:</strong> <code style="font-size:11px;word-break:break-all">${res.catalog?.id || '—'}</code>
      <span style="font-size:10px;padding:1px 6px;border-radius:8px;background:${catBg};color:${catColor};margin-left:8px">${rbStatusLabel(res.catalog?.result?.status)}</span>
    </div>`;
  const [dsIcon, dsColor, dsBg] = statusIcon(res.dataService?.result?.status);
  html += `<div class="result-item" style="margin-top:6px">
      <span class="result-icon" style="color:${dsColor}">${dsIcon}</span>
      <strong>Data Service:</strong> <code style="font-size:11px;word-break:break-all">${res.dataService?.id || '—'}</code>
      <span style="font-size:10px;padding:1px 6px;border-radius:8px;background:${dsBg};color:${dsColor};margin-left:8px">${rbStatusLabel(res.dataService?.result?.status)}</span>
    </div>
  </div>`;

  html += `<div class="card"><h3>${t('rb_datasets_title')}</h3>`;
  for (const d of res.datasets) {
    const [dIcon, dColor, dBg] = statusIcon(d.dataset?.status || d.dataset);
    const distSt = d.distribution?.status || '—';
    const polSt = d.policy?.status || '—';
    html += `<div class="result-item">
      <span class="result-icon" style="color:${dColor}">${dIcon}</span>
      <span class="method method-${d.method}" style="font-size:10px">${d.method}</span>
      <span style="font-family:monospace;font-size:12px">${d.path}</span>
      <span style="font-size:10px;padding:1px 6px;border-radius:8px;background:${dBg};color:${dColor};margin-left:auto">${rbStatusLabel(d.dataset?.status || d.dataset)}</span>
    </div>
    <div style="font-size:10px;color:var(--muted);margin:2px 0 6px 28px">
      Distribution: ${rbStatusLabel(distSt)} | Policy: ${rbStatusLabel(polSt)}
    </div>`;
  }

  const deletedDatasets = res.deletedDatasets || [];
  if (deletedDatasets.length) {
    for (const dd of deletedDatasets) {
      const [ddIcon, ddColor, ddBg] = statusIcon('deleted');
      html += `<div class="result-item">
        <span class="result-icon" style="color:${ddColor}">${ddIcon}</span>
        <span style="font-family:monospace;font-size:12px">${dd.operationId}</span>
        <span style="font-size:10px;padding:1px 6px;border-radius:8px;background:${ddBg};color:${ddColor};margin-left:auto">${rbStatusLabel('deleted')}</span>
      </div>`;
    }
  }

  if (res.policyPayload) {
    html += `<details style="margin-top:8px;font-size:11px"><summary style="cursor:pointer;color:var(--muted)">${t('rb_view_payload')} — Policy</summary>
      <pre style="background:#f6f8fa;padding:10px;border-radius:4px;overflow-x:auto;margin-top:6px;font-size:11px">${JSON.stringify(res.policyPayload, null, 2)}</pre>
    </details>`;
  }
  html += '</div>';

  c.innerHTML = html;
}
