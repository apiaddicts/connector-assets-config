let _soDebounceTimer = null;
let _soData = null;

function getSoUrl() {
  const el = document.getElementById('f_serviceOfferingUrl');
  return el ? el.value.trim() : '';
}

function getSoData() {
  return _soData;
}

function setFieldIfEmpty(id, value) {
  if (!value) return;
  const el = document.getElementById(id);
  if (!el) return;
  if (el.value && el.value.trim()) return;
  el.value = value;
  el.classList.add('auto');
}

function setFieldAlways(id, value) {
  if (!value) return;
  const el = document.getElementById(id);
  if (!el) return;
  el.value = value;
  el.classList.add('auto');
}

function mapRegimeToLocation(regime) {
  if (!regime) return '';
  if (regime.includes('GDPR')) return 'EU';
  return '';
}

function extractCountryFromSubdivision(subdivision) {
  if (!subdivision) return '';
  const parts = subdivision.split('-');
  return parts[0] || '';
}

function autoFillFromSO(soData) {
  if (!soData) return;
  const cs = soData.credentialSubject || {};

  setFieldIfEmpty('f_serviceUrl', cs['gx:endpoint'] || '');
  setFieldIfEmpty('f_providerDid', soData.issuer || '');

  const tcUrl = cs['gx:termsAndConditions']?.['gx:URL'];
  const tcHash = cs['gx:termsAndConditions']?.['gx:hash'];
  setFieldIfEmpty('f_termsUrl', tcUrl || '');
  setFieldIfEmpty('f_termsHash', tcHash || '');

  const regime = cs['gx:dataProtectionRegime'];
  const locationEl = document.getElementById('f_dataLocation');
  if (locationEl && !locationEl.value && regime) {
    const loc = mapRegimeToLocation(regime);
    if (loc) { locationEl.value = loc; locationEl.classList.add('auto'); }
  }
}

function autoFillFromParticipant(participantData) {
  if (!participantData) return;
  const cs = participantData.credentialSubject || {};

  setFieldIfEmpty('f_legalName', cs['gx:legalName'] || '');
  setFieldIfEmpty('f_providerDid', participantData.issuer || '');

  const hq = cs['gx:headquarterAddress']?.['gx:countrySubdivisionCode'];
  setFieldIfEmpty('f_country', extractCountryFromSubdivision(hq));

  const legal = cs['gx:legalAddress']?.['gx:countrySubdivisionCode'];
  setFieldIfEmpty('f_legalAddressCountry', extractCountryFromSubdivision(legal));
}

function fetchParticipantAndFill(providedByUrl) {
  if (!providedByUrl) return;
  fetch('/api/service-offering?url=' + encodeURIComponent(providedByUrl))
    .then(function (resp) { return resp.ok ? resp.json() : null; })
    .then(function (data) {
      if (data) autoFillFromParticipant(data);
    })
    .catch(function () {});
}

function renderSoVerification(state, data, error) {
  const box = document.getElementById('soVerification');
  if (!box) return;

  if (state === 'idle') {
    box.style.display = 'none';
    _soData = null;
    return;
  }

  box.style.display = 'block';

  if (state === 'loading') {
    box.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:8px;display:flex;align-items:center;gap:8px"><div class="spinner" style="width:16px;height:16px;border-width:2px"></div> ' + t('so_verifying') + '</div>';
    return;
  }

  if (state === 'error') {
    _soData = null;
    box.innerHTML = '<div style="font-size:12px;color:var(--danger);padding:8px;background:#fee2e2;border-radius:var(--radius)">' +
      '<strong>&#10007;</strong> ' + (error || t('so_error')) + '</div>';
    return;
  }

  _soData = data;
  const cs = data.credentialSubject || {};
  const issuer = data.issuer || '?';
  const providedBy = cs['gx:providedBy']?.id || '?';
  const endpoint = cs['gx:endpoint'] || '';
  const serviceType = cs['gx:serviceType'] || '';
  const regime = cs['gx:dataProtectionRegime'] || '';
  const proof = data.proof || {};

  let html = '<div style="padding:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:var(--radius);font-size:12px">';
  html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px"><span style="color:var(--success);font-size:16px">&#10003;</span> <strong>' + t('so_verified') + '</strong></div>';
  html += '<div style="display:flex;flex-direction:column;gap:3px">';
  html += '<div><strong>' + t('so_issuer') + ':</strong> <code style="font-size:11px">' + issuer + '</code></div>';
  html += '<div><strong>' + t('so_provided_by') + ':</strong> <code style="font-size:11px">' + providedBy + '</code></div>';
  if (endpoint) html += '<div><strong>' + t('so_endpoint') + ':</strong> ' + endpoint + '</div>';
  if (serviceType) html += '<div><strong>' + t('so_service_type') + ':</strong> ' + serviceType + '</div>';
  if (regime) html += '<div><strong>' + t('so_regime') + ':</strong> ' + regime + '</div>';
  html += '<div><strong>' + t('so_signed') + ':</strong> ' + (proof.verificationMethod || '?') + '</div>';
  html += '</div></div>';

  box.innerHTML = html;

  autoFillFromSO(data);

  if (providedBy && providedBy !== '?') {
    fetchParticipantAndFill(providedBy);
  }
}

function verifySoUrl() {
  const url = getSoUrl();
  if (!url) {
    renderSoVerification('idle');
    return;
  }

  renderSoVerification('loading');

  fetch('/api/service-offering?url=' + encodeURIComponent(url))
    .then(function (resp) {
      if (!resp.ok) return resp.json().then(function (d) { throw new Error(d.error || 'HTTP ' + resp.status); });
      return resp.json();
    })
    .then(function (data) { renderSoVerification('ok', data); })
    .catch(function (err) { renderSoVerification('error', null, err.message); });
}

function initSoField() {
  const input = document.getElementById('f_serviceOfferingUrl');
  if (!input) return;
  input.addEventListener('input', function () {
    clearTimeout(_soDebounceTimer);
    _soDebounceTimer = setTimeout(verifySoUrl, 600);
  });
  input.addEventListener('blur', verifySoUrl);
}
