function isValidUrl(v) {
  try { const u = new URL(v); return u.protocol === 'https:' || u.protocol === 'http:'; } catch { return false; }
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isValidDid(v) {
  return /^did:(web|key):.+$/.test(v);
}

function isValidCountry(v) {
  return /^[A-Z]{2}$/.test(v);
}

function isValidSpdx(v) {
  return /^[A-Za-z0-9][A-Za-z0-9.\-]*\+?$/.test(v);
}

function isNotEmpty(v) {
  return v.trim().length > 0;
}

function isValidSha256(v) {
  return /^[a-fA-F0-9]{64}$/.test(v.trim());
}

function getAuthMode() {
  const el = document.querySelector('input[name="authMode"]:checked');
  return el ? el.value : 'none';
}

function isEdcSelected() {
  return typeof getConnectorType === 'function' ? getConnectorType() === 'edc' : true;
}

const FIELD_RULES = [
  { id: 'f_connectorType', radioName: 'connectorType', errorKey: 'val_connector_required', required: true },
  { id: 'f_edcUrl', validate: isValidUrl, errorKey: 'val_invalid_url', required: true },
  { id: 'f_edcApiKey', validate: isNotEmpty, errorKey: 'val_required', conditionalRequired: isEdcSelected },
  { id: 'f_serviceOfferingUrl', validate: isValidUrl, errorKey: 'val_so_required', required: true },
  { id: 'f_serviceUrl', validate: isValidUrl, errorKey: 'val_invalid_url', required: true },
  { id: 'f_oauth2TokenUrl', validate: isValidUrl, errorKey: 'val_invalid_url', conditionalRequired: () => isEdcSelected() && getAuthMode() === 'oauth2' },
  { id: 'f_oauth2ClientId', validate: isNotEmpty, errorKey: 'val_oauth2_required', conditionalRequired: () => isEdcSelected() && getAuthMode() === 'oauth2' },
  { id: 'f_oauth2ClientSecretKey', validate: isNotEmpty, errorKey: 'val_oauth2_required', conditionalRequired: () => isEdcSelected() && getAuthMode() === 'oauth2' },
];

function showFieldError(el, msgKey) {
  el.classList.add('error');
  el.classList.remove('valid');
  let errEl = el.parentElement.querySelector('.field-error');
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.className = 'field-error';
    const hint = el.parentElement.querySelector('.hint');
    if (hint) hint.after(errEl);
    else el.after(errEl);
  }
  errEl.textContent = t(msgKey);
}

function showFieldValid(el) {
  el.classList.remove('error');
  el.classList.add('valid');
  const errEl = el.parentElement.querySelector('.field-error');
  if (errEl) errEl.remove();
}

function clearFieldState(el) {
  el.classList.remove('error', 'valid');
  const errEl = el.parentElement.querySelector('.field-error');
  if (errEl) errEl.remove();
}

function validateField(fieldId) {
  const rule = FIELD_RULES.find(r => r.id === fieldId);
  if (!rule) return true;

  if (rule.radioName) {
    const container = document.getElementById(fieldId);
    if (!container) return true;
    const selected = document.querySelector(`input[name="${rule.radioName}"]:checked`);
    const isRequired = rule.required || (rule.conditionalRequired?.());
    if (!selected) {
      if (isRequired) { showFieldError(container, rule.errorKey); return false; }
      clearFieldState(container);
      return true;
    }
    showFieldValid(container);
    return true;
  }

  const el = document.getElementById(fieldId);
  if (!el) return true;

  const value = el.value.trim();
  const isRequired = rule.required || (rule.conditionalRequired?.());

  if (!value) {
    if (isRequired) {
      showFieldError(el, rule.required ? 'val_required' : rule.errorKey);
      return false;
    }
    showFieldValid(el);
    return true;
  }

  if (!rule.validate(value)) {
    showFieldError(el, rule.errorKey);
    return false;
  }

  showFieldValid(el);
  return true;
}

function validateAllFields() {
  let allValid = true;
  for (const rule of FIELD_RULES) {
    const isRequired = rule.required || (rule.conditionalRequired?.());
    if (!isRequired && !rule.radioName) {
      const el = document.getElementById(rule.id);
      if (el && !el.value.trim()) { showFieldValid(el); continue; }
    }
    if (!validateField(rule.id)) allValid = false;
  }
  return allValid;
}

function initValidation() {
  for (const rule of FIELD_RULES) {
    if (rule.radioName) {
      document.querySelectorAll(`input[name="${rule.radioName}"]`).forEach(radio => {
        radio.addEventListener('change', () => validateField(rule.id));
      });
      continue;
    }
    const el = document.getElementById(rule.id);
    if (!el) continue;
    el.addEventListener('blur', () => validateField(rule.id));
  }

  document.querySelectorAll('input[name="authMode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      ['f_oauth2TokenUrl', 'f_oauth2ClientId', 'f_oauth2ClientSecretKey'].forEach(id => {
        const el = document.getElementById(id);
        if (el) clearFieldState(el);
      });
    });
  });
}
