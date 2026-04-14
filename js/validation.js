/**
 * Form validation: required fields, format rules, inline feedback.
 * Depends on: utils.js (getVal), app.js (currentPolicyMode)
 */

var REQUIRED = [
  'f_issuer', 'f_legalName', 'f_country', 'f_copyrightOwner',
  'f_serviceBaseUrl', 'f_name', 'f_version', 'f_license',
  'f_vcId', 'f_credentialSubjectId', 'f_edcUrl', 'f_edcApiKey'
];

var FIELD_RULES = {
  f_issuer: {
    test: function(v) { return !v || /^did:web:[a-zA-Z0-9._:%-]+$/.test(v); },
    msg: 'Format: did:web:yourdomain.com'
  },
  f_country: {
    test: function(v) { return !v || /^[A-Za-z]{2}$/.test(v); },
    msg: '2-letter ISO code (ES, DE, FR...)'
  },
  f_serviceBaseUrl: {
    test: function(v) {
      if (!v) return true;
      try { return new URL(v).protocol.startsWith('http'); } catch(e) { return false; }
    },
    msg: 'Must be a valid https:// URL'
  },
  f_edcUrl: {
    test: function(v) {
      if (!v) return true;
      try { return new URL(v).protocol.startsWith('http'); } catch(e) { return false; }
    },
    msg: 'Must be a valid https:// URL'
  },
  f_license: {
    test: function(v) { return !v || v.startsWith('http'); },
    msg: 'Use an SPDX URI: https://spdx.org/licenses/...'
  },
  f_vcId: {
    test: function(v) {
      if (!v) return true;
      try { new URL(v); return true; } catch(e) { return false; }
    },
    msg: 'Must be a valid URL'
  },
  f_credentialSubjectId: {
    test: function(v) {
      if (!v) return true;
      try { new URL(v); return true; } catch(e) { return false; }
    },
    msg: 'Must be a valid URL'
  }
};

function validateField(id) {
  var val = getVal(id);
  var isEmpty = !val;
  var isRequired = REQUIRED.includes(id);
  var rule = FIELD_RULES[id];
  var formatOk = rule ? rule.test(val) : true;

  var el = document.getElementById(id);
  var errEl = document.getElementById('err_' + id.replace('f_', ''));
  if (!el) return true;

  if (isRequired && isEmpty) {
    el.classList.add('error');
    if (errEl) { errEl.textContent = 'This field is required'; errEl.style.display = 'block'; }
    return false;
  }
  if (!formatOk) {
    el.classList.add('error');
    if (errEl) { errEl.textContent = rule.msg; errEl.style.display = 'block'; }
    return false;
  }
  el.classList.remove('error');
  if (errEl) errEl.style.display = 'none';
  return true;
}

function validate() {
  var ok = true;
  var seen = {};
  var allFields = REQUIRED.concat(Object.keys(FIELD_RULES)).filter(function(id) {
    if (seen[id]) return false;
    seen[id] = true;
    return true;
  });

  allFields.forEach(function(id) {
    if (!validateField(id)) ok = false;
  });

  // Policy mode-specific validation
  if (currentPolicyMode === 'clone') {
    if (!getVal('f_clonePolicyId'))   { ok = false; alert('Clone mode: Policy ID is required.'); }
    if (!getVal('f_clonePolicyName')) { ok = false; alert('Clone mode: Policy Name is required.'); }
  } else if (currentPolicyMode === 'custom') {
    if (!getVal('f_customPolicyId'))   { ok = false; alert('Custom mode: Policy ID is required.'); }
    if (!getVal('f_customPolicyName')) { ok = false; alert('Custom mode: Policy Name is required.'); }
    var raw = getVal('f_customOdrl');
    if (!raw) {
      ok = false; alert('Custom mode: ODRL JSON-LD is required.');
    } else {
      try { JSON.parse(raw); } catch(e) { ok = false; alert('Custom mode: ODRL is not valid JSON.'); }
    }
  }
  return ok;
}

function attachInlineValidation() {
  var seen = {};
  var allFields = REQUIRED.concat(Object.keys(FIELD_RULES)).filter(function(id) {
    if (seen[id]) return false;
    seen[id] = true;
    return true;
  });

  allFields.forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;

    // Validate on blur
    el.addEventListener('blur', function() { validateField(id); });

    // For format-validated fields: debounced input validation
    if (FIELD_RULES[id]) {
      var timer;
      el.addEventListener('input', function() {
        clearTimeout(timer);
        timer = setTimeout(function() {
          var val = getVal(id);
          if (val) {
            validateField(id);
          } else {
            el.classList.remove('error');
            var err = document.getElementById('err_' + id.replace('f_', ''));
            if (err) err.style.display = 'none';
          }
        }, 600);
      });
    }
  });

  // Country field: uppercase as you type
  var countryEl = document.getElementById('f_country');
  if (countryEl) {
    countryEl.addEventListener('input', function() {
      countryEl.value = countryEl.value.toUpperCase();
    });
  }
}
