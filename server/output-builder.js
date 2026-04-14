const { buildRainbowOutput } = require('./rainbow-output-builder');

function buildOutput(config, r) {
  if (config.connectorType === 'rainbow') {
    return buildRainbowOutput(config, r);
  }
  const {
    apiName, apiVersion, serviceBaseUrl, basePath, description,
    authMode, authKey, vaultAuthKey, secretName,
    oauth2TokenUrl, oauth2ClientId, oauth2ClientSecretKey,
    operations,
  } = config;

  const count = (arr, st) => arr.filter(a => a.result.status === st).length;
  const ts = new Date().toISOString();

  return {
    timestamp: ts,
    connectorType: 'edc',
    success: count(r.assetsDetail, 'error') === 0 && r.cdResult.result.status !== 'error',

    config: {
      edcUrl: config.edcUrl, apiName,
      serviceOfferingUrl: config.serviceOfferingUrl || null,
      apiVersion: apiVersion || '1.0.0',
      serviceBaseUrl,
      basePath: basePath || '',
      fullUpstreamUrl: r.fullUrl,
      description: description || null,
      accessPolicy: {
        level: r.ap.level || null,
        constraints: (r.ap.constraints || []).filter(c => c.leftOperand && c.rightOperand),
        prohibitions: r.ap.prohibitions || [],
        obligations: r.ap.obligations || [],
      },
      contractPolicy: {
        level: r.cp.level || null,
        constraints: (r.cp.constraints || []).filter(c => c.leftOperand && c.rightOperand),
        prohibitions: r.cp.prohibitions || [],
        obligations: r.cp.obligations || [],
      },
      upstreamAuth: buildAuthConfig(authMode, authKey, vaultAuthKey, secretName, oauth2TokenUrl, oauth2ClientId, oauth2ClientSecretKey),
      operationsIncluded: r.includedOps.length,
      operationsExcluded: operations.length - r.includedOps.length,
    },

    summary: {
      api: `${apiName} v${apiVersion || '1.0.0'}`,
      hasActiveAgreement: r.hasActiveAgreement,
      accessPolicy: r.accessPolicyResult.status,
      contractPolicy: r.contractPolicyResult.status,
      assetsCreated: count(r.assetsDetail, 'created'),
      assetsUpdated: count(r.assetsDetail, 'updated'),
      assetsSkipped: count(r.assetsDetail, 'skipped') + count(r.assetsDetail, 'exists'),
      assetsFailed: count(r.assetsDetail, 'error'),
      assetsDeleted: r.deletedAssets.filter(a => a.result.status === 'deleted').length,
      contractDefinition: r.cdResult.result.status,
      lockedContractDefId: r.hasActiveAgreement ? r.contractDefId : null,
      newContractDefId: r.hasActiveAgreement ? r.cdResult.actualId : null,
    },

    resources: {
      accessPolicy: {
        id: r.accessPolicyId, level: r.ap.level || null,
        payload: r.accessPolicyPayload, result: r.accessPolicyResult,
      },
      contractPolicy: {
        id: r.contractPolicyId, level: r.cp.level || null,
        payload: r.contractPolicyPayload, result: r.contractPolicyResult,
      },
      assets: r.assetsDetail,
      deletedAssets: r.deletedAssets,
      contractDefinition: {
        id: r.cdResult.actualId, accessPolicyId: r.accessPolicyId,
        contractPolicyId: r.contractPolicyId,
        assetIds: r.assetIds, payload: r.cdResult.payload,
        result: r.cdResult.result,
        lockedPreviousId: r.cdResult.lockedPreviousId,
      },
    },
  };
}

function buildAuthConfig(authMode, authKey, vaultAuthKey, secretName, oauth2TokenUrl, oauth2ClientId, oauth2ClientSecretKey) {
  if (authMode === 'none') return null;
  const base = { mode: authMode };
  if (authMode === 'direct') return { ...base, headerName: authKey || null };
  if (authMode === 'vault') return { ...base, headerName: vaultAuthKey || null, secretName: secretName || null };
  if (authMode === 'oauth2') return { ...base, tokenUrl: oauth2TokenUrl || null, clientId: oauth2ClientId || null, clientSecretKey: oauth2ClientSecretKey || null };
  return base;
}

module.exports = { buildOutput };
