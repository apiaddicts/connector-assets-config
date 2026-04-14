const EDC_CONTEXT = { '@vocab': 'https://w3id.org/edc/v0.0.1/ns/' };
const ODRL_CONTEXT = 'http://www.w3.org/ns/odrl.jsonld';

function mapConstraint(c) {
  return {
    leftOperand: c.leftOperand,
    operator: c.operator.replace('odrl:', ''),
    rightOperand: c.rightOperand,
  };
}

function buildRuleConstraints(rule) {
  const cs = (rule.constraints || []).filter(c => c.leftOperand && c.leftOperand !== '__custom__' && c.rightOperand);
  if (!cs.length) return {};
  return { constraint: cs.length === 1 ? mapConstraint(cs[0]) : [{ and: cs.map(mapConstraint) }] };
}

function buildCustomPolicy(id, constraints, prohibitions, obligations) {
  const permission = { action: 'use' };

  const validConstraints = constraints.filter(c => c.leftOperand && c.leftOperand !== '__custom__' && c.rightOperand);
  if (validConstraints.length === 1) {
    permission.constraint = mapConstraint(validConstraints[0]);
  } else if (validConstraints.length > 1) {
    permission.constraint = [{ and: validConstraints.map(mapConstraint) }];
  }

  const innerPolicy = {
    '@context': ODRL_CONTEXT,
    '@type': 'Set',
    permission: [permission],
  };

  if (prohibitions.length) {
    innerPolicy.prohibition = prohibitions.map(p => ({
      action: p.action.replace('odrl:', ''),
      ...buildRuleConstraints(p),
    }));
  }

  if (obligations.length) {
    innerPolicy.obligation = obligations.map(o => ({
      action: o.action.replace('odrl:', ''),
      ...buildRuleConstraints(o),
    }));
  }

  return { '@context': EDC_CONTEXT, '@type': 'PolicyDefinition', '@id': id, policy: innerPolicy };
}

function buildPolicy(id, level) {
  if (level === 1) {
    return {
      '@context': EDC_CONTEXT, '@type': 'PolicyDefinition', '@id': id,
      policy: { '@context': ODRL_CONTEXT, '@type': 'Set', permission: [{ action: 'use' }] },
    };
  }

  if (level === 2) {
    return {
      '@context': EDC_CONTEXT, '@type': 'PolicyDefinition', '@id': id,
      policy: {
        '@context': ODRL_CONTEXT, '@type': 'Set',
        permission: [{
          action: 'use',
          constraint: { leftOperand: 'Membership', operator: 'eq', rightOperand: 'active' },
        }],
        prohibition: [{ action: 'distribute' }],
      },
    };
  }

  return {
    '@context': EDC_CONTEXT, '@type': 'PolicyDefinition', '@id': id,
    policy: {
      '@context': ODRL_CONTEXT, '@type': 'Set',
      permission: [{
        action: 'use',
        constraint: [{
          and: [
            { leftOperand: 'Membership', operator: 'eq', rightOperand: 'active' },
            { leftOperand: 'DataProcessing.location', operator: 'eq', rightOperand: 'EU/EEA' },
          ],
        }],
      }],
      prohibition: [
        { action: 'transfer' },
        { action: 'distribute' },
        { action: 'derive' },
      ],
    },
  };
}

module.exports = { buildPolicy, buildCustomPolicy };
