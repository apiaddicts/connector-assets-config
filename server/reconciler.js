const { reconcile: edcReconcile } = require('./edc-reconciler');
const { reconcile: rainbowReconcile } = require('./rainbow-reconciler');

async function reconcile(config) {
  if (config.connectorType === 'rainbow') {
    return rainbowReconcile(config);
  }
  return edcReconcile(config);
}

module.exports = { reconcile };
