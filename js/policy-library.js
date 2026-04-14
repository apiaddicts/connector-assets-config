/**
 * Pre-built ODRL policy library for EDC connector.
 * Each policy contains the full ODRL JSON-LD that the EDC Management API expects.
 */
var POLICY_LIBRARY = {
  'policy-open': {
    id: 'policy-open',
    name: 'Open Access',
    action: 'odrl:use',
    constraints: [],
    prohibitions: [],
    odrl: {
      "@type": "odrl:Set",
      "odrl:permission": [{ "odrl:action": "odrl:use" }]
    }
  },
  'policy-gaiax-l1': {
    id: 'policy-gaiax-l1',
    name: 'Gaia-X Level 1',
    action: 'odrl:use',
    constraints: [
      { "odrl:leftOperand": "gx:complianceLevel", "odrl:operator": { "@id": "odrl:gteq" }, "odrl:rightOperand": "gaia-x-level-1" }
    ],
    prohibitions: [],
    odrl: {
      "@type": "odrl:Set",
      "odrl:permission": [{
        "odrl:action": "odrl:use",
        "odrl:constraint": [
          { "odrl:leftOperand": "gx:complianceLevel", "odrl:operator": { "@id": "odrl:gteq" }, "odrl:rightOperand": "gaia-x-level-1" }
        ]
      }]
    }
  },
  'policy-gaiax-l2': {
    id: 'policy-gaiax-l2',
    name: 'Gaia-X Level 2',
    action: 'odrl:use',
    constraints: [
      { "odrl:leftOperand": "gx:complianceLevel", "odrl:operator": { "@id": "odrl:gteq" }, "odrl:rightOperand": "gaia-x-level-2" }
    ],
    prohibitions: [],
    odrl: {
      "@type": "odrl:Set",
      "odrl:permission": [{
        "odrl:action": "odrl:use",
        "odrl:constraint": [
          { "odrl:leftOperand": "gx:complianceLevel", "odrl:operator": { "@id": "odrl:gteq" }, "odrl:rightOperand": "gaia-x-level-2" }
        ]
      }]
    }
  },
  'policy-eu-only': {
    id: 'policy-eu-only',
    name: 'EU/EEA Only',
    action: 'odrl:use',
    constraints: [
      { "odrl:leftOperand": "odrl:spatial", "odrl:operator": { "@id": "odrl:eq" }, "odrl:rightOperand": "EU" }
    ],
    prohibitions: [],
    odrl: {
      "@type": "odrl:Set",
      "odrl:permission": [{
        "odrl:action": "odrl:use",
        "odrl:constraint": [
          { "odrl:leftOperand": "odrl:spatial", "odrl:operator": { "@id": "odrl:eq" }, "odrl:rightOperand": "EU" }
        ]
      }]
    }
  },
  'policy-gaiax-l1-eu': {
    id: 'policy-gaiax-l1-eu',
    name: 'Gaia-X L1 + EU',
    action: 'odrl:use',
    constraints: [
      { "odrl:leftOperand": "gx:complianceLevel", "odrl:operator": { "@id": "odrl:gteq" }, "odrl:rightOperand": "gaia-x-level-1" },
      { "odrl:leftOperand": "odrl:spatial", "odrl:operator": { "@id": "odrl:eq" }, "odrl:rightOperand": "EU" }
    ],
    prohibitions: [],
    odrl: {
      "@type": "odrl:Set",
      "odrl:permission": [{
        "odrl:action": "odrl:use",
        "odrl:constraint": [
          { "odrl:leftOperand": "gx:complianceLevel", "odrl:operator": { "@id": "odrl:gteq" }, "odrl:rightOperand": "gaia-x-level-1" },
          { "odrl:leftOperand": "odrl:spatial", "odrl:operator": { "@id": "odrl:eq" }, "odrl:rightOperand": "EU" }
        ]
      }]
    }
  },
  'policy-no-distribute': {
    id: 'policy-no-distribute',
    name: 'Use, no redistribution',
    action: 'odrl:use',
    constraints: [],
    prohibitions: ['odrl:distribute'],
    odrl: {
      "@type": "odrl:Set",
      "odrl:permission": [{ "odrl:action": "odrl:use" }],
      "odrl:prohibition": [{ "odrl:action": "odrl:distribute" }]
    }
  },
  'policy-research-only': {
    id: 'policy-research-only',
    name: 'Research only',
    action: 'odrl:use',
    constraints: [
      { "odrl:leftOperand": "odrl:purpose", "odrl:operator": { "@id": "odrl:eq" }, "odrl:rightOperand": "research" }
    ],
    prohibitions: ['odrl:distribute', 'odrl:derive'],
    odrl: {
      "@type": "odrl:Set",
      "odrl:permission": [{
        "odrl:action": "odrl:use",
        "odrl:constraint": [
          { "odrl:leftOperand": "odrl:purpose", "odrl:operator": { "@id": "odrl:eq" }, "odrl:rightOperand": "research" }
        ]
      }],
      "odrl:prohibition": [
        { "odrl:action": "odrl:distribute" },
        { "odrl:action": "odrl:derive" }
      ]
    }
  }
};
