function mapConstraint(c) {
  return {
    leftOperand: c.leftOperand,
    operator: c.operator.replace('odrl:', ''),
    rightOperand: c.rightOperand,
  };
}

function buildCustomRainbowPolicy(constraints, prohibitions, obligations) {
  const permission = { action: 'use' };

  const validConstraints = constraints.filter(c => c.leftOperand && c.leftOperand !== '__custom__' && c.rightOperand);
  if (validConstraints.length) {
    permission.constraint = validConstraints.map(mapConstraint);
  }

  const policy = {
    permission: [permission],
    obligation: [],
    prohibition: [],
  };

  if (prohibitions.length) {
    policy.prohibition = prohibitions.map(p => {
      const rule = { action: p.action.replace('odrl:', '') };
      const cs = (p.constraints || []).filter(c => c.leftOperand && c.leftOperand !== '__custom__' && c.rightOperand);
      if (cs.length) rule.constraint = cs.map(mapConstraint);
      return rule;
    });
  }

  if (obligations.length) {
    policy.obligation = obligations.map(o => {
      const rule = { action: o.action.replace('odrl:', '') };
      const cs = (o.constraints || []).filter(c => c.leftOperand && c.leftOperand !== '__custom__' && c.rightOperand);
      if (cs.length) rule.constraint = cs.map(mapConstraint);
      return rule;
    });
  }

  return policy;
}

function buildRainbowPolicy(policyConfig) {
  const p = policyConfig || {};

  if (p.constraints?.length || p.prohibitions?.length || p.obligations?.length) {
    return buildCustomRainbowPolicy(p.constraints || [], p.prohibitions || [], p.obligations || []);
  }

  const level = Number.parseInt(p.level) || 1;

  if (level === 1) {
    return { permission: [{ action: 'use' }], obligation: [], prohibition: [] };
  }

  if (level === 2) {
    return {
      permission: [{
        action: 'use',
        constraint: [{ leftOperand: 'Membership', operator: 'eq', rightOperand: 'active' }],
      }],
      obligation: [],
      prohibition: [],
    };
  }

  return {
    permission: [{
      action: 'use',
      constraint: [
        { leftOperand: 'Membership', operator: 'eq', rightOperand: 'active' },
        { leftOperand: 'DataProcessing.location', operator: 'eq', rightOperand: 'EU/EEA' },
      ],
    }],
    obligation: [],
    prohibition: [],
  };
}

module.exports = { buildRainbowPolicy };
