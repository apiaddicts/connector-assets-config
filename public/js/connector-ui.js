function getConnectorType() {
  const el = document.querySelector('input[name="connectorType"]:checked');
  return el ? el.value : null;
}

function isRainbow() {
  return getConnectorType() === 'rainbow';
}

function toggleFieldVisibility(id, visible) {
  const el = document.getElementById(id);
  if (el) el.style.display = visible ? '' : 'none';
}

function updatePlaceholderAndHint(inputId, placeholder, hintKey) {
  const input = document.getElementById(inputId);
  if (input) input.placeholder = placeholder;
  const hint = input?.parentElement?.querySelector('.hint');
  if (hint) {
    hint.dataset.i18n = hintKey;
    hint.textContent = t(hintKey);
  }
}

function clearFieldError(fieldId) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.classList.remove('error');
  const errEl = el.parentElement.querySelector('.field-error');
  if (errEl) errEl.remove();
}

function swapI18nText(selector, key) {
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (!el) return;
  el.dataset.i18n = key;
  el.innerHTML = t(key);
}

function togglePolicyTabs(rainbow) {
  const accessTab = document.getElementById('tabAccess');
  const accessPane = document.getElementById('policyTabAccess');
  if (rainbow) {
    if (accessTab) accessTab.style.display = 'none';
    if (accessPane) accessPane.style.display = 'none';
    switchPolicyTab('contract');
  } else {
    if (accessTab) accessTab.style.display = '';
    if (accessPane) accessPane.style.display = '';
  }
}

function updateConnectorDescription() {
  const box = document.getElementById('connectorDescription');
  if (!box) return;
  const type = getConnectorType();
  if (!type) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  box.style.background = type === 'rainbow' ? '#eff6ff' : '#f0fdf4';
  box.style.color = type === 'rainbow' ? '#1e40af' : '#166534';
  box.innerHTML = t(type === 'rainbow' ? 'connector_rainbow_desc' : 'connector_edc_desc');
}

function updateDynamicLabels(rainbow) {
  swapI18nText('[data-i18n="review_assets_title"], [data-i18n="review_datasets_title"]',
    rainbow ? 'review_datasets_title' : 'review_assets_title');

  swapI18nText('[data-i18n="ops_desc"], [data-i18n="ops_desc_rainbow"]',
    rainbow ? 'ops_desc_rainbow' : 'ops_desc');

  swapI18nText('#btnDeploy', rainbow ? 'btn_deploy_rainbow' : 'btn_deploy');

  const opsIcon = document.querySelector('[data-i18n-icon="review_assets_title"]');
  if (opsIcon) opsIcon.textContent = rainbow ? 'D' : 'A';
}

function toggleEdcOnlyFields(rainbow) {
  const edcOnly = ['edcApiKeyField', 'contractDefCard', 'accessPolicyPreviewCard', 'cardUpstreamAuth'];
  for (const id of edcOnly) toggleFieldVisibility(id, !rainbow);

  const alwaysHidden = ['cardGxParticipant', 'cardGxResource', 'catalogEdcFields'];
  for (const id of alwaysHidden) toggleFieldVisibility(id, false);

  toggleFieldVisibility('transferFormatField', rainbow);

  const policyRow = document.getElementById('policyPreviewRow');
  if (policyRow) policyRow.style.gridTemplateColumns = rainbow ? '1fr' : '1fr 1fr';
}

function updateConnectorLabels(rainbow) {
  const placeholder = rainbow ? 'https://rainbow.example.com' : 'https://edc.example.com/management/v3';
  updatePlaceholderAndHint('f_edcUrl', placeholder, rainbow ? 'rainbow_url_hint' : 'edc_url_hint');

  swapI18nText('[data-i18n="edc_url_label"], [data-i18n="rainbow_url_label"]',
    rainbow ? 'rainbow_url_label' : 'edc_url_label');

  swapI18nText('[data-i18n="svc_url_hint"], [data-i18n="rainbow_svc_url_hint"]',
    rainbow ? 'rainbow_svc_url_hint' : 'svc_url_hint');

  swapI18nText('#policyDescription', rainbow ? 'rainbow_policy_desc' : 'policy_dual_desc');

  swapI18nText('#loadingState p', rainbow ? 'loading_msg_rainbow' : 'loading_msg');
}

function clearEdcFieldErrors() {
  ['f_edcApiKey'].forEach(clearFieldError);
}

function resolveLeftOperand(c) {
  return (c.leftOperand === '__custom__' && c._customLeft) ? c._customLeft : c.leftOperand;
}

function mapRainbowConstraint(c) {
  return { leftOperand: resolveLeftOperand(c), operator: c.operator, rightOperand: c.rightOperand };
}

function buildRainbowPolicyPreview(slot) {
  const s = policyState[slot || 'contract'];

  const permission = { action: 'use' };
  if (s.constraints.length) {
    permission.constraint = s.constraints.map(mapRainbowConstraint);
  }

  const policy = { permission: [permission], obligation: [], prohibition: [] };

  if (s.prohibitions.length) {
    policy.prohibition = s.prohibitions.map(p => {
      const rule = { action: p.action.replace('odrl:', '') };
      if (p.constraints?.length) rule.constraint = p.constraints.map(mapRainbowConstraint);
      return rule;
    });
  }
  if (s.obligations.length) {
    policy.obligation = s.obligations.map(o => {
      const rule = { action: o.action.replace('odrl:', '') };
      if (o.constraints?.length) rule.constraint = o.constraints.map(mapRainbowConstraint);
      return rule;
    });
  }
  return policy;
}

function toggleConnectorType() {
  const rainbow = isRainbow();

  toggleEdcOnlyFields(rainbow);
  togglePolicyTabs(rainbow);
  updateConnectorLabels(rainbow);
  if (rainbow) clearEdcFieldErrors();
  updateConnectorDescription();
  updateDynamicLabels(rainbow);
}
