function stripPathParams(path) {
  return path.replace(/\/\{[^}]+\}.*$/, '') || '/';
}

function hasPathParams(path) {
  return /\{[^}]+\}/.test(path);
}

function buildAssetPayload(assetId, op, cfg) {
  const proxyBody = ['POST', 'PUT', 'PATCH'].includes(op.method) ? 'true' : 'false';
  const desc = `${op.method} ${op.path}${op.summary ? ' — ' + op.summary : ''}`;
  const pathHasParams = hasPathParams(op.path);

  const cleanPath = pathHasParams ? stripPathParams(op.path) : op.path;
  const baseUrl = `${cfg.fullUrl}${cleanPath}`;

  const properties = {
    name: `${cfg.apiName} - ${op.summary || op.operationId}`,
    description: cfg.description || desc,
    version: cfg.apiVersion || '1.0.0',
    contenttype: cfg.contentType || 'application/json',
    apiName: cfg.apiName,
    apiVersion: cfg.apiVersion || '1.0.0',
    operationId: op.operationId,
    httpMethod: op.method,
    path: op.path,
    'gx:serviceOfferingVc': cfg.serviceOfferingUrl || null,
  };

  const dataAddress = {
    '@type': 'DataAddress',
    type: 'HttpData',
    baseUrl,
    proxyPath: pathHasParams ? 'true' : 'false',
    proxyQueryParams: 'true',
    proxyMethod: 'false',
    proxyBody,
  };
  if (cfg.authMode === 'direct') {
    if (cfg.authKey) dataAddress.authKey = cfg.authKey;
    if (cfg.authCode) dataAddress.authCode = cfg.authCode;
  } else if (cfg.authMode === 'vault') {
    if (cfg.vaultAuthKey) dataAddress.authKey = cfg.vaultAuthKey;
    if (cfg.secretName) dataAddress.secretName = cfg.secretName;
  } else if (cfg.authMode === 'oauth2') {
    if (cfg.oauth2TokenUrl) dataAddress['oauth2:tokenUrl'] = cfg.oauth2TokenUrl;
    if (cfg.oauth2ClientId) dataAddress['oauth2:clientId'] = cfg.oauth2ClientId;
    if (cfg.oauth2ClientSecretKey) dataAddress['oauth2:clientSecretKey'] = cfg.oauth2ClientSecretKey;
  }

  return {
    '@context': { '@vocab': 'https://w3id.org/edc/v0.0.1/ns/' },
    '@type': 'Asset',
    '@id': assetId,
    properties,
    dataAddress,
  };
}

module.exports = { buildAssetPayload };
