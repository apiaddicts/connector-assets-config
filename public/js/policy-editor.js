const policyState = {
  access:   { constraints: [], prohibitions: [], obligations: [], level: 1 },
  contract: { constraints: [], prohibitions: [], obligations: [], level: 1 },
};
let activeTab = 'access';
let policyConstraints = policyState.access.constraints;
let policyProhibitions = policyState.access.prohibitions;
let policyObligations = policyState.access.obligations;

function switchPolicyTab(tab) {
  activeTab = tab;
  policyConstraints = policyState[tab].constraints;
  policyProhibitions = policyState[tab].prohibitions;
  policyObligations = policyState[tab].obligations;
  selectedLevel = policyState[tab].level;
  document.getElementById('policyTabAccess').style.display = tab === 'access' ? 'block' : 'none';
  document.getElementById('policyTabContract').style.display = tab === 'contract' ? 'block' : 'none';
  document.getElementById('tabAccess').style.color = tab === 'access' ? 'var(--primary)' : 'var(--muted)';
  document.getElementById('tabAccess').style.borderBottomColor = tab === 'access' ? 'var(--primary)' : 'transparent';
  document.getElementById('tabContract').style.color = tab === 'contract' ? 'var(--primary)' : 'var(--muted)';
  document.getElementById('tabContract').style.borderBottomColor = tab === 'contract' ? 'var(--primary)' : 'transparent';
  renderAllPolicy();
}

const OPERATORS = [
  { v: 'eq', l: '= (eq)' },
  { v: 'neq', l: '!= (neq)' },
  { v: 'in', l: 'in' },
  { v: '__custom__', l: '-- Custom --' },
];

const ACTIONS = [
  { v: 'use', l: 'use', desc: 'Contract/usage policy (standard)', cx: true },
  { v: 'access', l: 'access', desc: 'Access policy — controls catalog visibility (Catena-X)', cx: true },
  { v: 'odrl:distribute', l: 'distribute', desc: 'Distribute data to third parties', cx: false },
  { v: 'odrl:transfer', l: 'transfer', desc: 'Transfer data ownership', cx: false },
  { v: 'odrl:derive', l: 'derive', desc: 'Create derivative works', cx: false },
  { v: 'odrl:modify', l: 'modify', desc: 'Modify the data', cx: false },
  { v: 'odrl:delete', l: 'delete', desc: 'Delete the data', cx: false },
  { v: 'odrl:aggregate', l: 'aggregate', desc: 'Aggregate with other data', cx: false },
  { v: 'odrl:annotate', l: 'annotate', desc: 'Add annotations', cx: false },
  { v: 'odrl:anonymize', l: 'anonymize', desc: 'Anonymize the data', cx: false },
  { v: 'odrl:compensate', l: 'compensate', desc: 'Compensate the provider', cx: false },
  { v: 'odrl:attribute', l: 'attribute', desc: 'Attribute the source', cx: false },
  { v: 'odrl:inform', l: 'inform', desc: 'Inform of usage', cx: false },
  { v: 'odrl:reproduce', l: 'reproduce', desc: 'Reproduce the data', cx: false },
  { v: 'odrl:extract', l: 'extract', desc: 'Extract portions', cx: false },
  { v: 'odrl:archive', l: 'archive', desc: 'Archive the data', cx: false },
  { v: 'odrl:read', l: 'read', desc: 'Read the data', cx: false },
  { v: 'odrl:display', l: 'display', desc: 'Display the data', cx: false },
  { v: 'odrl:present', l: 'present', desc: 'Present the data', cx: false },
];

const LEFT_OPERANDS = [
  { v: 'Membership', src: 'Catena-X', actions: ['access','use'], usableIn: ['permission'], right: ['active'], desc: 'Gaia-X / Catena-X membership (MembershipCredential)' },
  { v: 'FrameworkAgreement', src: 'Catena-X', actions: ['access','use'], usableIn: ['permission'], right: ['DataExchangeGovernance:1.0','Pcf:1.0','Sustainability:1.0','Quality:1.0','Traceability:1.0','BehavioralTwin:1.0','Resiliency:1.0','Bpdm:1.0','Puris:1.0','DemandCapacity:1.0','CircularEconomy:1.0'], desc: 'Signed framework agreement (subtype:version)' },
  { v: 'BusinessPartnerNumber', src: 'Catena-X', actions: ['access'], usableIn: ['permission'], right: [], desc: 'Specific BPN (e.g. BPNL000000000001)' },
  { v: 'BusinessPartnerGroup', src: 'Catena-X', actions: ['access'], usableIn: ['permission'], right: [], desc: 'BPN group name (e.g. gold-partners)' },
  { v: 'inForceDate', src: 'Catena-X', actions: ['access','use'], usableIn: ['permission'], right: [], desc: 'Contract validity date — stops transfers when exceeded' },
  { v: 'Dismantler', src: 'Catena-X', actions: ['use'], usableIn: ['permission'], right: ['active'], desc: 'Certified dismantler (DismantlerCredential)' },
  { v: 'Dismantler.activityType', src: 'Catena-X', actions: ['use'], usableIn: ['permission'], right: ['vehicleDismantle'], desc: 'Dismantler activity type' },
  { v: 'Dismantler.allowedBrands', src: 'Catena-X', actions: ['use'], usableIn: ['permission'], right: [], desc: 'Allowed vehicle brands (use operator "in")' },
  { v: 'UsagePurpose', src: 'Catena-X', actions: ['use'], usableIn: ['permission'], right: [], desc: 'Governing usage purpose (string:version)' },
  { v: 'ContractReference', src: 'Catena-X', actions: ['use'], usableIn: ['permission'], right: [], desc: 'Reference to terms/contract (string:version)' },
  { v: 'DataFrequency', src: 'Catena-X', actions: ['use'], usableIn: ['permission'], right: [], desc: 'Data update frequency' },
  { v: 'VersionChanges', src: 'Catena-X', actions: ['use'], usableIn: ['permission'], right: [], desc: 'Version change notifications' },
  { v: 'ContractTermination', src: 'Catena-X', actions: ['use'], usableIn: ['permission'], right: [], desc: 'Contract termination conditions' },
  { v: 'ConfidentialInformationMeasures', src: 'Catena-X', actions: ['use'], usableIn: ['permission'], right: [], desc: 'Confidential information protection measures' },
  { v: 'ConfidentialInformationSharing', src: 'Catena-X', actions: ['use'], usableIn: ['permission'], right: [], desc: 'Confidential information sharing rules' },
  { v: 'ExclusiveUsage', src: 'Catena-X', actions: ['use'], usableIn: ['permission'], right: [], desc: 'Exclusive usage rights' },
  { v: 'Warranty', src: 'Catena-X', actions: ['use'], usableIn: ['permission'], right: [], desc: 'Warranty terms' },
  { v: 'WarrantyDefinition', src: 'Catena-X', actions: ['use'], usableIn: ['permission'], right: [], desc: 'Warranty definition details' },
  { v: 'WarrantyDurationMonths', src: 'Catena-X', actions: ['use'], usableIn: ['permission'], right: [], desc: 'Warranty duration in months' },
  { v: 'Liability', src: 'Catena-X', actions: ['use'], usableIn: ['permission'], right: [], desc: 'Liability terms' },
  { v: 'JurisdictionLocation', src: 'Catena-X', actions: ['use'], usableIn: ['permission'], right: ['EU','DE','FR','ES','IT','NL','BE','AT','PL','PT'], desc: 'Applicable jurisdiction' },
  { v: 'JurisdictionLocationReference', src: 'Catena-X', actions: ['use'], usableIn: ['permission'], right: [], desc: 'Reference to jurisdiction location doc' },
  { v: 'Precedence', src: 'Catena-X', actions: ['use'], usableIn: ['permission'], right: [], desc: 'Legal precedence rules' },
  { v: 'DataUsageEndDefinition', src: 'Catena-X', actions: ['use'], usableIn: ['permission'], right: [], desc: 'Definition of data usage end conditions' },
  { v: 'DataUsageEndDate', src: 'Catena-X', actions: ['use'], usableIn: ['permission'], right: [], desc: 'Specific date when data usage ends (ISO 8601)' },
  { v: 'DataUsageEndDurationDays', src: 'Catena-X', actions: ['use'], usableIn: ['permission'], right: [], desc: 'Days until data usage ends' },
  { v: 'DataProvisioningEndDate', src: 'Catena-X', actions: ['use'], usableIn: ['obligation'], right: [], desc: 'Date when data provisioning ends (ISO 8601)' },
  { v: 'DataProvisioningEndDurationDays', src: 'Catena-X', actions: ['use'], usableIn: ['obligation'], right: [], desc: 'Days until data provisioning ends' },
  { v: 'AffiliatesRegion', src: 'Catena-X', actions: ['use'], usableIn: ['permission','prohibition'], right: ['EU','EEA','NAFTA','APAC'], desc: 'Affiliates region restriction' },
  { v: 'AffiliatesBpnl', src: 'Catena-X', actions: ['use'], usableIn: ['permission','prohibition'], right: [], desc: 'Affiliates BPN list' },
  { v: 'UsageRestriction', src: 'Catena-X', actions: ['use'], usableIn: ['prohibition'], right: [], desc: 'Usage restriction (prohibited use)' },
  { v: 'DataProcessing.location', src: 'Gaia-X', actions: ['use'], usableIn: ['permission'], right: ['EU/EEA','EU','DE','FR','ES','IT','NL','BE','AT','PL','PT'], desc: 'Where data can be processed' },
  { v: 'DataAccess.level', src: 'Gaia-X', actions: ['use'], usableIn: ['permission'], right: ['public','restricted','confidential'], desc: 'Data access classification' },
  { v: '__custom__', src: '', actions: [], usableIn: [], right: [], desc: 'Custom leftOperand (needs PolicyFunction)' },
];

function applyPolicyTemplate(tpl, slot) {
  slot = slot || activeTab;
  const s = policyState[slot];
  const warn = document.getElementById(slot + 'TemplateWarning');
  const tabEl = document.getElementById('policyTab' + slot.charAt(0).toUpperCase() + slot.slice(1));
  tabEl.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
  const card = tabEl.querySelector('.level-' + tpl);
  if (card) card.classList.add('selected');

  if (tpl === '1') {
    s.constraints = []; s.prohibitions = []; s.obligations = [];
    warn.style.display = 'none';
    s.level = 1;
  } else if (tpl === '2') {
    s.constraints = [
      { leftOperand: 'Membership', operator: 'eq', rightOperand: 'active', desc: 'Gaia-X membership requerida', locked: true },
    ];
    s.prohibitions = [{ action: 'odrl:distribute', locked: true }];
    s.obligations = [];
    warn.style.display = 'block';
    warn.textContent = t('level2_warn');
    s.level = 2;
  } else if (tpl === '3') {
    s.constraints = [
      { leftOperand: 'Membership', operator: 'eq', rightOperand: 'active', desc: 'Gaia-X membership requerida', locked: true },
      { leftOperand: 'DataProcessing.location', operator: 'eq', rightOperand: 'EU/EEA', desc: 'Procesamiento solo en EU', locked: true },
    ];
    s.prohibitions = [
      { action: 'odrl:transfer', locked: true },
      { action: 'odrl:distribute', locked: true },
      { action: 'odrl:derive', locked: true },
    ];
    s.obligations = [];
    warn.style.display = 'block';
    warn.textContent = t('level3_warn');
    s.level = 3;
  } else {
    s.constraints = []; s.prohibitions = []; s.obligations = [];
    warn.style.display = 'none';
    s.level = 0;
  }

  if (slot === activeTab) {
    policyConstraints = s.constraints;
    policyProhibitions = s.prohibitions;
    policyObligations = s.obligations;
    selectedLevel = s.level;
  }

  renderAllPolicy();
}

function renderAllPolicy() {
  renderConstraints();
  renderProhibitions();
  renderObligations();
  updatePolicyPreview();
}

function addConstraint(slot) {
  const actionType = (slot || activeTab) === 'access' ? 'access' : 'use';
  const validOps = getValidLeftOperands(actionType);
  const first = validOps.find(l => l.v !== '__custom__');
  const lo = first ? first.v : '';
  const ro = first && first.right.length > 0 ? first.right[0] : '';
  const desc = first ? first.desc : '';
  policyConstraints.push({ leftOperand: lo, operator: 'eq', rightOperand: ro, desc });
  renderConstraints();
  updatePolicyPreview();
}

function removeConstraint(i) {
  policyConstraints.splice(i, 1);
  renderConstraints();
  updatePolicyPreview();
}

function updateConstraint(i, field, val) {
  policyConstraints[i][field] = val;
  updatePolicyPreview();
}

function getValidLeftOperands(actionType) {
  return LEFT_OPERANDS.filter(lo => lo.v === '__custom__' || lo.actions.includes(actionType));
}

function buildLeftOpOptions(selected) {
  const actionType = activeTab === 'access' ? 'access' : 'use';
  const validOps = getValidLeftOperands(actionType);
  let isKnown = false;
  let html = '';
  for (const lo of validOps) {
    if (lo.v === '__custom__') continue;
    const sel = lo.v === selected ? 'selected' : '';
    if (sel) isKnown = true;
    html += `<option value="${lo.v}" ${sel}>${lo.v} (${lo.src})</option>`;
  }
  const customSel = (selected && !isKnown) ? 'selected' : '';
  html += `<option value="__custom__" ${customSel}>-- Custom --</option>`;
  return html;
}

function buildRightOpField(i, constraint) {
  const lo = LEFT_OPERANDS.find(l => l.v === constraint.leftOperand);
  const val = constraint.rightOperand || '';
  const lockedStyle = constraint.locked ? 'background:#f0f6ff;border-color:#93c5fd;font-weight:600' : '';

  if (lo && lo.right.length > 0) {
    const isKnown = lo.right.includes(val);
    let html = `<select onchange="updateConstraint(${i},'rightOperand',this.value);if(this.value==='__custom__')this.nextElementSibling.style.display='block'" ${constraint.locked ? 'disabled' : ''} style="${lockedStyle}">`;
    for (const r of lo.right) {
      html += `<option value="${r}" ${r === val ? 'selected' : ''}>${r}</option>`;
    }
    html += `<option value="__custom__" ${!isKnown && val ? 'selected' : ''}>-- otro --</option>`;
    html += `</select>`;
    html += `<input value="${!isKnown ? val : ''}" placeholder="valor custom" style="margin-top:4px;display:${!isKnown && val ? 'block' : 'none'};${lockedStyle}" ${constraint.locked ? 'readonly' : ''} oninput="updateConstraint(${i},'rightOperand',this.value)">`;
    return html;
  }

  return `<input value="${val}" placeholder="valor" style="${lockedStyle}" ${constraint.locked ? 'readonly' : ''} onchange="updateConstraint(${i},'rightOperand',this.value)" oninput="updateConstraint(${i},'rightOperand',this.value)">`;
}

function renderConstraints() {
  const c = document.getElementById(activeTab + 'PermConstraints');
  if (!policyConstraints.length) {
    c.innerHTML = '<p style="font-size:11px;color:var(--muted);font-style:italic;margin-bottom:8px">' + t('policy_no_constraints') + '</p>';
    return;
  }

  let html = '';
  policyConstraints.forEach((cn, i) => {
    const lockedStyle = cn.locked ? 'background:#f0f6ff;border-color:#93c5fd;font-weight:600' : '';
    const delBtn = cn.locked
      ? '<span style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--primary)" title="Requerido por el template">&#128274;</span>'
      : `<button class="btn-icon" onclick="removeConstraint(${i})" title="Eliminar">&times;</button>`;

    const loMeta = LEFT_OPERANDS.find(l => l.v === cn.leftOperand && l.v !== '__custom__');
    const isCustomOp = !OPERATORS.some(o => o.v === cn.operator && o.v !== '__custom__');

    const opOpts = OPERATORS.map(o => {
      const sel = o.v === cn.operator ? 'selected' : '';
      const customSel = (o.v === '__custom__' && isCustomOp) ? 'selected' : '';
      return `<option value="${o.v}" ${sel || customSel}>${o.l}</option>`;
    }).join('');

    const statusHtml = isCustomOp
      ? '<span style="color:#b45309;font-weight:600">&#9888; Custom</span>'
      : '<span style="color:var(--success)">&#10003; Nativo EDC</span>';

    html += `<div class="rule-block">
      <div class="rule-block-header">
        <select onchange="onLeftOperandChange(${i},this.value)" ${cn.locked ? 'disabled' : ''} style="${lockedStyle}">${buildLeftOpOptions(cn.leftOperand)}</select>
        <select onchange="onOperatorChange(${i},this.value)" ${cn.locked ? 'disabled' : ''} style="${lockedStyle}">${opOpts}</select>
        <div>${buildRightOpField(i, cn)}</div>
        <div class="status-badge">${statusHtml}</div>
        ${delBtn}
      </div>
      ${loMeta ? `<div style="padding:0 10px 8px;font-size:10px;color:var(--muted)">${loMeta.desc}</div>` : ''}
    </div>`;
  });

  document.getElementById(activeTab + 'PermConstraints').innerHTML = html;
}

function onLeftOperandChange(i, val) {
  if (val === '__custom__') {
    policyConstraints[i].leftOperand = '__custom__';
    policyConstraints[i].rightOperand = '';
  } else {
    policyConstraints[i].leftOperand = val;
    const lo = LEFT_OPERANDS.find(l => l.v === val);
    if (lo && lo.right.length > 0 && !policyConstraints[i].rightOperand) {
      policyConstraints[i].rightOperand = lo.right[0];
    }
    if (lo && lo.desc && !policyConstraints[i].desc) {
      policyConstraints[i].desc = lo.desc;
    }
  }
  renderConstraints();
  updatePolicyPreview();
}

function onOperatorChange(i, val) {
  if (val === '__custom__') {
    policyConstraints[i].operator = '';
  } else {
    policyConstraints[i].operator = val;
  }
  renderConstraints();
  updatePolicyPreview();
}

function addProhibition() {
  policyProhibitions.push({ action: 'odrl:distribute', constraints: [] });
  renderProhibitions();
  updatePolicyPreview();
}

function removeProhibition(i) {
  policyProhibitions.splice(i, 1);
  renderProhibitions();
  updatePolicyPreview();
}

function addProhibConstraint(i) {
  policyProhibitions[i].constraints = policyProhibitions[i].constraints || [];
  const actionType = activeTab === 'access' ? 'access' : 'use';
  const first = LEFT_OPERANDS.find(l => l.v !== '__custom__' && l.actions.includes(actionType) && l.usableIn.includes('prohibition'));
  policyProhibitions[i].constraints.push({
    leftOperand: first ? first.v : '', operator: 'eq',
    rightOperand: first && first.right.length ? first.right[0] : '',
  });
  renderProhibitions();
  updatePolicyPreview();
}

function removeProhibConstraint(i, ci) {
  policyProhibitions[i].constraints.splice(ci, 1);
  renderProhibitions();
  updatePolicyPreview();
}

function renderRuleConstraints(rule, ruleIdx, ruleType) {
  const constraints = rule.constraints || [];
  if (!constraints.length) return '';
  const actionType = activeTab === 'access' ? 'access' : 'use';
  const validLefts = LEFT_OPERANDS.filter(l => l.v === '__custom__' || (l.actions.includes(actionType) && l.usableIn.includes(ruleType)));
  let html = '';
  constraints.forEach((cn, ci) => {
    const loMeta = validLefts.find(l => l.v === cn.leftOperand && l.v !== '__custom__');
    const isCustomOp = !OPERATORS.some(o => o.v === cn.operator && o.v !== '__custom__');

    let leftOpts = '';
    let isKnown = false;
    for (const lo of validLefts) {
      if (lo.v === '__custom__') continue;
      const sel = lo.v === cn.leftOperand ? 'selected' : '';
      if (sel) isKnown = true;
      leftOpts += `<option value="${lo.v}" ${sel}>${lo.v} (${lo.src})</option>`;
    }
    leftOpts += `<option value="__custom__" ${!isKnown && cn.leftOperand ? 'selected' : ''}>-- Custom --</option>`;

    const optsOp = OPERATORS.map(o => {
      const sel = o.v === cn.operator ? 'selected' : '';
      const customSel = (o.v === '__custom__' && isCustomOp) ? 'selected' : '';
      return `<option value="${o.v}" ${sel || customSel}>${o.l}</option>`;
    }).join('');

    let rightHtml;
    if (loMeta && loMeta.right.length > 0) {
      const isKnR = loMeta.right.includes(cn.rightOperand);
      const pArrName = ruleType === 'prohibition' ? 'policyProhibitions' : 'policyObligations';
      rightHtml = `<select onchange="${pArrName}[${ruleIdx}].constraints[${ci}].rightOperand=this.value;updatePolicyPreview()">`;
      for (const r of loMeta.right) rightHtml += `<option value="${r}" ${r === cn.rightOperand ? 'selected' : ''}>${r}</option>`;
      rightHtml += `<option value="__custom__" ${!isKnR && cn.rightOperand ? 'selected' : ''}>-- otro --</option></select>`;
    } else {
      rightHtml = `<input value="${cn.rightOperand || ''}" placeholder="valor" oninput="policy${ruleType === 'prohibition' ? 'Prohibitions' : 'Obligations'}[${ruleIdx}].constraints[${ci}].rightOperand=this.value;updatePolicyPreview()">`;
    }

    const pArr = ruleType === 'prohibition' ? 'policyProhibitions' : 'policyObligations';
    const reRender = 'renderProhibitions();renderObligations();updatePolicyPreview()';
    const removeFn = ruleType === 'prohibition' ? 'removeProhibConstraint' : 'removeObligConstraint';

    html += `<div class="rule-constraint-row">
      <select onchange="${pArr}[${ruleIdx}].constraints[${ci}].leftOperand=this.value;${reRender}">${leftOpts}</select>
      <select onchange="if(this.value==='__custom__'){${pArr}[${ruleIdx}].constraints[${ci}].operator='';${reRender}}else{${pArr}[${ruleIdx}].constraints[${ci}].operator=this.value;${reRender}}">${optsOp}</select>
      ${rightHtml}
      <button class="btn-icon" onclick="${removeFn}(${ruleIdx},${ci})" title="Eliminar constraint">&times;</button>
    </div>`;
  });
  return html;
}

function renderProhibitions() {
  const c = document.getElementById(activeTab + 'ProhibActions');
  if (!policyProhibitions.length) {
    c.innerHTML = '<p style="font-size:11px;color:var(--muted);font-style:italic;margin-bottom:8px">' + t('policy_no_prohibitions') + '</p>';
    return;
  }
  const optsAct = ACTIONS.filter(a => a.v !== 'use' && a.v !== 'access').map(a => `<option value="${a.v}">${a.l}${a.cx ? '' : ' (ODRL)'}</option>`).join('');
  let html = '';
  policyProhibitions.forEach((p, i) => {
    const sel = optsAct.replace(`value="${p.action}"`, `value="${p.action}" selected`);
    const selDis = p.locked ? 'disabled style="background:#f0f6ff;border-color:#93c5fd;font-weight:600"' : '';
    const delBtn = p.locked
      ? '<span style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--primary)" title="Requerido por el template">&#128274;</span>'
      : `<button class="btn-icon" onclick="removeProhibition(${i})" title="Eliminar">&times;</button>`;
    const addCBtn = p.locked ? '' : `<button class="btn-add-inline" onclick="addProhibConstraint(${i})">+ constraint</button>`;
    const nestedHtml = renderRuleConstraints(p, i, 'prohibition');
    html += `<div class="rule-block">
      <div class="rule-block-header" style="grid-template-columns:1fr auto auto">
        <select ${selDis} onchange="policyProhibitions[${i}].action=this.value;updatePolicyPreview()">${sel}</select>
        ${addCBtn}
        ${delBtn}
      </div>
      ${nestedHtml ? `<div class="rule-block-body">${nestedHtml}</div>` : ''}
    </div>`;
  });
  c.innerHTML = html;
}

function addObligation() {
  policyObligations.push({ action: 'odrl:inform', constraints: [] });
  renderObligations();
  updatePolicyPreview();
}

function removeObligation(i) {
  policyObligations.splice(i, 1);
  renderObligations();
  updatePolicyPreview();
}

function addObligConstraint(i) {
  policyObligations[i].constraints = policyObligations[i].constraints || [];
  const actionType = activeTab === 'access' ? 'access' : 'use';
  const first = LEFT_OPERANDS.find(l => l.v !== '__custom__' && l.actions.includes(actionType) && l.usableIn.includes('obligation'));
  policyObligations[i].constraints.push({
    leftOperand: first ? first.v : '', operator: 'eq',
    rightOperand: first && first.right.length ? first.right[0] : '',
  });
  renderObligations();
  updatePolicyPreview();
}

function removeObligConstraint(i, ci) {
  policyObligations[i].constraints.splice(ci, 1);
  renderObligations();
  updatePolicyPreview();
}

function renderObligations() {
  const c = document.getElementById(activeTab + 'ObligActions');
  if (!policyObligations.length) {
    c.innerHTML = '<p style="font-size:11px;color:var(--muted);font-style:italic;margin-bottom:8px">' + t('policy_no_obligations') + '</p>';
    return;
  }
  const optsAct = ACTIONS.map(a => `<option value="${a.v}">${a.l}${a.cx ? '' : ' (ODRL)'}</option>`).join('');
  let html = '';
  policyObligations.forEach((o, i) => {
    const sel = optsAct.replace(`value="${o.action}"`, `value="${o.action}" selected`);
    const nestedHtml = renderRuleConstraints(o, i, 'obligation');
    html += `<div class="rule-block">
      <div class="rule-block-header" style="grid-template-columns:1fr auto auto">
        <select onchange="policyObligations[${i}].action=this.value;updatePolicyPreview()">${sel}</select>
        <button class="btn-add-inline" onclick="addObligConstraint(${i})">+ constraint</button>
        <button class="btn-icon" onclick="removeObligation(${i})" title="Eliminar">&times;</button>
      </div>
      ${nestedHtml ? `<div class="rule-block-body">${nestedHtml}</div>` : ''}
    </div>`;
  });
  c.innerHTML = html;
}

function buildPolicyPayload(policyId, slot) {
  const s = policyState[slot || activeTab];
  const actionType = (slot || activeTab) === 'access' ? 'access' : 'use';

  function resolveLeft(c) {
    return (c.leftOperand === '__custom__' && c._customLeft) ? c._customLeft : c.leftOperand;
  }
  const mapConstraint = c => ({
    leftOperand: resolveLeft(c),
    operator: c.operator,
    rightOperand: c.rightOperand,
  });

  const permission = { action: actionType };

  if (s.constraints.length === 1) {
    permission.constraint = mapConstraint(s.constraints[0]);
  } else if (s.constraints.length > 1) {
    permission.constraint = [{
      and: s.constraints.map(mapConstraint),
    }];
  }

  const policy = {
    '@context': [
      'https://w3id.org/dspace/2025/1/odrl-profile.jsonld',
      'https://w3id.org/catenax/2025/9/policy/context.jsonld',
      { '@vocab': 'https://w3id.org/edc/v0.0.1/ns/' },
    ],
    '@type': 'PolicyDefinition',
    '@id': policyId,
    policy: {
      '@type': 'Set',
      permission: [permission],
    },
  };

  if (s.prohibitions.length) {
    policy.policy.prohibition = s.prohibitions.map(p => ({
      action: p.action.replace('odrl:', ''),
      ...(p.constraints && p.constraints.length ? {
        constraint: p.constraints.length === 1
          ? mapConstraint(p.constraints[0])
          : [{ and: p.constraints.map(mapConstraint) }],
      } : {}),
    }));
  }

  if (s.obligations.length) {
    policy.policy.obligation = s.obligations.map(o => ({
      action: o.action.replace('odrl:', ''),
      ...(o.constraints && o.constraints.length ? {
        constraint: o.constraints.length === 1
          ? mapConstraint(o.constraints[0])
          : [{ and: o.constraints.map(mapConstraint) }],
      } : {}),
    }));
  }

  return policy;
}

function updatePolicyPreview() {
  const slug = (document.getElementById('f_apiName').value || 'my-api').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const accessPayload = buildPolicyPayload(`${slug}-access-policy`, 'access');
  const contractPayload = buildPolicyPayload(`${slug}-contract-policy`, 'contract');

  const accEl = document.getElementById('accessPolicyPreview');
  const conEl = document.getElementById('contractPolicyPreview');
  if (accEl) accEl.textContent = JSON.stringify(accessPayload, null, 2);
  if (conEl) conEl.textContent = JSON.stringify(contractPayload, null, 2);

  const nativeOps = new Set(['eq', 'neq', 'in']);
  const allConstraints = [
    ...policyState.access.constraints,
    ...policyState.access.prohibitions.flatMap(p => p.constraints || []),
    ...policyState.access.obligations.flatMap(o => o.constraints || []),
    ...policyState.contract.constraints,
    ...policyState.contract.prohibitions.flatMap(p => p.constraints || []),
    ...policyState.contract.obligations.flatMap(o => o.constraints || []),
  ];
  const needsExtension = allConstraints.some(c => {
    const isCustomOp = c.operator && !nativeOps.has(c.operator);
    const lo = LEFT_OPERANDS.find(l => l.v === c.leftOperand && l.v !== '__custom__');
    return isCustomOp || (!lo && c.leftOperand && c.leftOperand !== '__custom__');
  });
  const warnEl = document.getElementById('policyFunctionWarning');
  if (warnEl) warnEl.style.display = needsExtension ? 'block' : 'none';
}
