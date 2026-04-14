/**
 * Policy mode switching and ODRL builder for clone mode.
 * Depends on: utils.js (slugify, getVal), policy-library.js (POLICY_LIBRARY), app.js (currentPolicyMode)
 */

function setPolicyMode(mode) {
  currentPolicyMode = mode;
  ['preset', 'clone', 'custom'].forEach(function(m) {
    document.getElementById('policyMode_' + m).style.display = m === mode ? 'block' : 'none';
    var tab = document.getElementById('tab_' + m);
    tab.style.background = m === mode ? 'var(--primary)' : 'var(--card)';
    tab.style.color = m === mode ? 'white' : 'var(--muted)';
  });
}

function onPresetChange() {
  var sel = document.getElementById('f_presetPolicy');
  var opt = sel.options[sel.selectedIndex];
  var policy = POLICY_LIBRARY[sel.value];

  document.getElementById('presetId').textContent = sel.value;
  document.getElementById('presetAction').textContent = 'odrl:' + (opt.dataset.action || 'use');
  document.getElementById('presetDescText').textContent = opt.dataset.desc || '';
  document.getElementById('presetConstraints').textContent = opt.dataset.constraints || 'none';
  document.getElementById('presetProhibitions').textContent = opt.dataset.prohibitions || 'none';

  if (policy) {
    var fullOdrl = {
      "@context": {
        "@vocab": "https://w3id.org/edc/v0.0.1/ns/",
        "odrl": "http://www.w3.org/ns/odrl/2/"
      },
      "@id": policy.id,
      "policy": policy.odrl
    };
    document.getElementById('presetOdrlPreview').textContent = JSON.stringify(fullOdrl, null, 2);
  }
}

function onCloneBaseChange() {
  var base = document.getElementById('f_cloneBase').value;
  var policy = POLICY_LIBRARY[base];
  if (!policy) return;

  // Pre-fill clone fields from the base policy
  var slug = slugify(getVal('f_name') || 'api');
  document.getElementById('f_clonePolicyId').value = base + '-' + slug;
  document.getElementById('f_clonePolicyName').value = policy.name + ' (customized)';

  // Set access level from base constraints
  var constraints = policy.constraints.map(function(c) { return c['odrl:leftOperand']; });
  if (constraints.includes('gx:complianceLevel') && constraints.includes('odrl:spatial')) {
    document.getElementById('f_cloneAccessLevel').value = 'gaiax-l1';
  } else if (constraints.includes('gx:complianceLevel')) {
    var lvl = policy.constraints.find(function(c) { return c['odrl:leftOperand'] === 'gx:complianceLevel'; });
    document.getElementById('f_cloneAccessLevel').value =
      (lvl && lvl['odrl:rightOperand'] && lvl['odrl:rightOperand'].includes('2')) ? 'gaiax-l2' : 'gaiax-l1';
  } else if (constraints.includes('odrl:spatial')) {
    document.getElementById('f_cloneAccessLevel').value = 'eu-only';
  } else if (constraints.includes('odrl:purpose')) {
    document.getElementById('f_cloneAccessLevel').value = 'purpose';
  } else {
    document.getElementById('f_cloneAccessLevel').value = 'none';
  }

  // Set prohibitions checkboxes
  ['distribute', 'derive', 'share', 'export', 'modify'].forEach(function(a) {
    var cb = document.getElementById('cproh_' + a);
    if (cb) cb.checked = policy.prohibitions.includes('odrl:' + a);
  });
}

function buildOdrlFromClone() {
  var action = 'odrl:' + getVal('f_cloneAction').toLowerCase();
  var access = getVal('f_cloneAccessLevel');
  var constraints = [];

  if (access === 'gaiax-l1')
    constraints.push({ "odrl:leftOperand": "gx:complianceLevel", "odrl:operator": { "@id": "odrl:gteq" }, "odrl:rightOperand": "gaia-x-level-1" });
  if (access === 'gaiax-l2')
    constraints.push({ "odrl:leftOperand": "gx:complianceLevel", "odrl:operator": { "@id": "odrl:gteq" }, "odrl:rightOperand": "gaia-x-level-2" });
  if (access === 'eu-only' || access === 'gaiax-l1-eu')
    constraints.push({ "odrl:leftOperand": "odrl:spatial", "odrl:operator": { "@id": "odrl:eq" }, "odrl:rightOperand": "EU" });
  if (getVal('f_clonePurpose'))
    constraints.push({ "odrl:leftOperand": "odrl:purpose", "odrl:operator": { "@id": "odrl:eq" }, "odrl:rightOperand": getVal('f_clonePurpose') });
  if (getVal('f_cloneValidUntil'))
    constraints.push({ "odrl:leftOperand": "odrl:dateTime", "odrl:operator": { "@id": "odrl:lt" }, "odrl:rightOperand": new Date(getVal('f_cloneValidUntil')).toISOString() });

  var prohibitions = ['distribute', 'derive', 'share', 'export', 'modify']
    .filter(function(a) { var cb = document.getElementById('cproh_' + a); return cb && cb.checked; })
    .map(function(a) { return { "odrl:action": "odrl:" + a }; });

  var permission = { "odrl:action": action };
  if (constraints.length) permission["odrl:constraint"] = constraints;

  var odrl = { "@type": "odrl:Set", "odrl:permission": [permission] };
  if (prohibitions.length) odrl["odrl:prohibition"] = prohibitions;

  return odrl;
}
