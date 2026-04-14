let _cdIdManuallyEdited = false;

function slugifyClient(s) {
  return (s || '').toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/^-|-$/g, '');
}

function resetCdIdEdited() {
  _cdIdManuallyEdited = false;
}

function onCdIdInput() {
  _cdIdManuallyEdited = true;
}

function levelLabel(level) {
  const map = { 0: t('level_custom'), 1: t('level1_name'), 2: t('level2_name'), 3: t('level3_name') };
  return map[level] || t('level_custom');
}

function levelBadgeColor(level) {
  if (level === 1) return { bg: '#dafbe1', color: '#1a7f37' };
  if (level === 2) return { bg: '#fff8c5', color: '#9a6700' };
  if (level === 3) return { bg: '#fee2e2', color: '#991b1b' };
  return { bg: '#f6f8fa', color: 'var(--muted)' };
}

function renderSoPreview() {
  const card = document.getElementById('reviewSoCard');
  const content = document.getElementById('reviewSoContent');
  if (!card || !content) return;

  const soUrl = typeof getSoUrl === 'function' ? getSoUrl() : '';
  const soData = typeof getSoData === 'function' ? getSoData() : null;

  if (!soUrl) {
    card.style.display = 'none';
    return;
  }

  card.style.display = '';
  const rainbow = typeof isRainbow === 'function' && isRainbow();
  const connectorLabel = rainbow ? 'Rainbow' : 'EDC';

  if (!soData) {
    content.innerHTML = `<div style="color:var(--danger)"><strong>&#10007;</strong> ${t('val_so_invalid')}</div>
      <div style="margin-top:4px"><code style="font-size:11px">${soUrl}</code></div>`;
    return;
  }

  const cs = soData.credentialSubject || {};
  const issuer = soData.issuer || '?';
  const providedBy = cs['gx:providedBy']?.id || '?';
  const endpoint = cs['gx:endpoint'] || '';
  const serviceType = cs['gx:serviceType'] || '';
  const regime = cs['gx:dataProtectionRegime'] || '';
  const tcUrl = cs['gx:termsAndConditions']?.['gx:URL'] || '';

  let html = '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">';
  html += '<span style="color:var(--success);font-size:16px">&#10003;</span>';
  html += `<strong>${t('so_verified')}</strong>`;
  html += `<a href="#" onclick="goStep(2);return false" style="font-size:11px;color:var(--primary);margin-left:auto">${t('review_edit_policy')}</a>`;
  html += '</div>';

  html += '<div style="display:flex;flex-direction:column;gap:4px">';
  html += `<div><strong>URL:</strong> <code style="font-size:11px;word-break:break-all">${soUrl}</code></div>`;
  html += `<div><strong>${t('so_issuer')}:</strong> <code style="font-size:11px">${issuer}</code></div>`;
  html += `<div><strong>${t('so_provided_by')}:</strong> <code style="font-size:11px;word-break:break-all">${providedBy}</code></div>`;
  if (endpoint) html += `<div><strong>${t('so_endpoint')}:</strong> ${endpoint}</div>`;
  if (serviceType) html += `<div><strong>${t('so_service_type')}:</strong> ${serviceType}</div>`;
  if (regime) html += `<div><strong>${t('so_regime')}:</strong> ${regime}</div>`;
  if (tcUrl) html += `<div><strong>T&amp;C:</strong> ${tcUrl}</div>`;
  html += '</div>';

  html += `<div style="margin-top:8px;padding:6px 10px;background:#eff6ff;border-radius:var(--radius);font-size:11px;color:#1e40af">`;
  html += `<strong>${connectorLabel}:</strong> `;
  if (rainbow) {
    html += `${t('so_url_label')} → <code>dct:conformsTo</code> ${t('review_so_rainbow_note')}`;
  } else {
    html += `${t('so_url_label')} → <code>gx:serviceOfferingVc</code> ${t('review_so_edc_note')}`;
  }
  html += '</div>';

  content.innerHTML = html;
}

function renderPolicyPreviewCard(slot, policyId, rainbow) {
  const level = policyState[slot].level;
  const label = levelLabel(level);
  const badge = levelBadgeColor(level);
  const payload = rainbow && typeof buildRainbowPolicyPreview === 'function'
    ? buildRainbowPolicyPreview(slot)
    : buildPolicyPayload(policyId, slot);

  const el = document.getElementById(`preview${slot.charAt(0).toUpperCase() + slot.slice(1)}Policy`);
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <code style="font-size:12px;background:#f6f8fa;padding:2px 6px;border-radius:4px">${policyId}</code>
      <span style="font-size:10px;padding:2px 8px;border-radius:8px;background:${badge.bg};color:${badge.color};font-weight:600">Level ${level} — ${label}</span>
      <a href="#" onclick="goStep(2);switchPolicyTab('${slot}');return false" style="font-size:11px;color:var(--primary);margin-left:auto">${t('review_edit_policy')}</a>
    </div>
    ${renderPolicySummary(slot)}
    <details style="margin-top:8px">
      <summary style="cursor:pointer;font-size:11px;color:var(--muted)">${t('review_view_json')}</summary>
      <pre style="background:#1e1e2e;color:#cdd6f4;padding:10px;border-radius:var(--radius);overflow-x:auto;font-size:10px;margin-top:6px;max-height:250px;overflow-y:auto">${JSON.stringify(payload, null, 2)}</pre>
    </details>`;
}

function renderReview() {
  const rainbow = typeof isRainbow === 'function' && isRainbow();
  const slug = slugifyClient(parsedSpec?.title || document.getElementById('f_apiName').value || 'my-api');
  const prefix = `${slug}-`;
  const accessPolicyId = `${prefix}access-policy`;
  const contractPolicyId = `${prefix}contract-policy`;
  const defaultCdId = `${prefix}contract-def`;

  const contractDefCard = document.getElementById('contractDefCard');
  if (contractDefCard) contractDefCard.style.display = rainbow ? 'none' : '';

  const policySlots = rainbow ? [['contract', contractPolicyId]] : [['access', accessPolicyId], ['contract', contractPolicyId]];

  for (const [slot, policyId] of policySlots) {
    renderPolicyPreviewCard(slot, policyId, rainbow);
  }

  renderSoPreview();
  renderOps();
  updateAssetsSummary();

  const cdInput = document.getElementById('f_contractDefId');
  if (cdInput && !_cdIdManuallyEdited) {
    cdInput.value = defaultCdId;
  }

  const cdAccessRef = document.getElementById('previewCdAccessPolicyId');
  const cdContractRef = document.getElementById('previewCdContractPolicyId');
  const cdAssetCount = document.getElementById('previewCdAssetCount');

  if (cdAccessRef) cdAccessRef.textContent = accessPolicyId;
  if (cdContractRef) cdContractRef.textContent = contractPolicyId;
  if (cdAssetCount) {
    const included = extractedOps.filter(o => o.included !== false).length;
    cdAssetCount.textContent = included;
  }
}

function renderPolicySummary(slot) {
  const s = policyState[slot];
  const parts = [];

  if (s.constraints.length) {
    const names = s.constraints.map(c => c.leftOperand === '__custom__' ? 'Custom' : c.leftOperand);
    parts.push(`<span style="font-size:11px"><strong>Constraints:</strong> ${names.join(', ')}</span>`);
  }
  if (s.prohibitions.length) {
    const names = s.prohibitions.map(p => (p.action || '').replace('odrl:', ''));
    parts.push(`<span style="font-size:11px"><strong>${t('policy_prohibitions')}:</strong> ${names.join(', ')}</span>`);
  }
  if (s.obligations.length) {
    const names = s.obligations.map(o => (o.action || '').replace('odrl:', ''));
    parts.push(`<span style="font-size:11px"><strong>${t('policy_obligations')}:</strong> ${names.join(', ')}</span>`);
  }

  if (!parts.length) {
    return `<div style="font-size:11px;color:var(--muted);font-style:italic">${t('policy_no_constraints')}</div>`;
  }
  return `<div style="display:flex;flex-direction:column;gap:2px">${parts.join('')}</div>`;
}

function updateAssetsSummary() {
  const el = document.getElementById('assetsSummaryLine');
  if (!el) return;

  const included = extractedOps.filter(o => o.included !== false);
  const hasHistory = !!loadedHistory;

  const rb = typeof isRainbow === 'function' && isRainbow();

  if (hasHistory) {
    const toCreate = included.filter(o => !o._deployed).length;
    const toDelete = extractedOps.filter(o => o._deployed && !o.included).length;
    const toUpdate = included.filter(o => o._deployed).length;
    const key = rb ? 'review_datasets_summary' : 'review_assets_summary';
    el.innerHTML = t(key)
      .replace('{create}', `<strong style="color:var(--success)">${toCreate}</strong>`)
      .replace('{update}', `<strong style="color:#1e40af">${toUpdate}</strong>`)
      .replace('{delete}', `<strong style="color:var(--danger)">${toDelete}</strong>`);
  } else {
    const key = rb ? 'review_datasets_summary_simple' : 'review_assets_summary_simple';
    el.innerHTML = t(key)
      .replace('{count}', `<strong>${included.length}</strong>`);
  }
}
