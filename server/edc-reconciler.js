const { edcGet, ensureResource, removeResource } = require('./edc-client');
const { buildPolicy, buildCustomPolicy } = require('./policy-builder');
const { buildAssetPayload } = require('./asset-builder');
const { slugify } = require('./helpers');

function buildPolicyPayload(id, policyConfig) {
  const p = policyConfig || {};
  if (p.constraints?.length || p.prohibitions?.length || p.obligations?.length) {
    return buildCustomPolicy(id, p.constraints || [], p.prohibitions || [], p.obligations || []);
  }
  return buildPolicy(id, Number.parseInt(p.level) || 1);
}

async function reconcilePolicies(policyId, payload, hasActiveAgreement, headers, edcUrl) {
  if (hasActiveAgreement) {
    return { status: 'locked', httpCode: 409 };
  }
  return await ensureResource('policydefinitions', policyId, payload, headers, edcUrl);
}

async function reconcileAssets(includedOps, prefix, prevAssetIds, assetCfg, headers, edcUrl) {
  const assetIds = [];
  const assetsDetail = [];

  for (const op of includedOps) {
    const assetId = `${prefix}${op.operationId}`;
    assetIds.push(assetId);
    prevAssetIds.delete(assetId);

    const assetPayload = buildAssetPayload(assetId, op, assetCfg);
    const assetResult = await ensureResource('assets', assetId, assetPayload, headers, edcUrl);
    assetsDetail.push({
      id: assetId, operationId: op.operationId,
      method: op.method, path: op.path,
      summary: op.summary || '',
      payload: assetPayload, result: assetResult,
    });
  }

  const deletedAssets = [];
  for (const oldId of prevAssetIds) {
    const delResult = await removeResource('assets', oldId, headers, edcUrl);
    deletedAssets.push({ id: oldId, result: delResult });
  }

  return { assetIds, assetsDetail, deletedAssets };
}

async function reconcileContractDef(contractDefId, accessPolicyId, contractPolicyId, assetIds, hasActiveAgreement, headers, edcUrl) {
  let actualId = contractDefId;
  if (hasActiveAgreement) {
    actualId = `${contractDefId}-v${Date.now()}`;
  }

  const payload = {
    '@context': { '@vocab': 'https://w3id.org/edc/v0.0.1/ns/' },
    '@type': 'ContractDefinition',
    '@id': actualId,
    accessPolicyId,
    contractPolicyId,
    assetsSelector: [{
      '@type': 'Criterion',
      operandLeft: 'https://w3id.org/edc/v0.0.1/ns/id',
      operator: 'in',
      operandRight: assetIds,
    }],
  };

  const result = await ensureResource('contractdefinitions', actualId, payload, headers, edcUrl);
  return { actualId, payload, result, lockedPreviousId: hasActiveAgreement ? contractDefId : null };
}

async function buildConflictDiff({ contractDefId, accessPolicyId, contractPolicyId, ap, cp, operations, prefix, headers, edcUrl }) {
  const currentCd = await edcGet(`${edcUrl}/contractdefinitions/${contractDefId}`, headers);
  const currentAp = await edcGet(`${edcUrl}/policydefinitions/${accessPolicyId}`, headers);
  const currentCp = await edcGet(`${edcUrl}/policydefinitions/${contractPolicyId}`, headers);

  let currentAssetIds = [];
  if (currentCd.found && currentCd.data?.assetsSelector) {
    const sel = Array.isArray(currentCd.data.assetsSelector) ? currentCd.data.assetsSelector : [currentCd.data.assetsSelector];
    for (const s of sel) {
      const right = s.operandRight || s['edc:operandRight'] || s['https://w3id.org/edc/v0.0.1/ns/operandRight'];
      if (Array.isArray(right)) currentAssetIds.push(...right);
      else if (right) currentAssetIds.push(right);
    }
  }

  const includedOps = operations.filter(o => o.included !== false);
  const desiredAssetIds = includedOps.map(o => `${prefix}${o.operationId}`);

  const currentSet = new Set(currentAssetIds);
  const desiredSet = new Set(desiredAssetIds);
  const addedAssets = desiredAssetIds.filter(id => !currentSet.has(id));
  const removedAssets = currentAssetIds.filter(id => !desiredSet.has(id));
  const keptAssets = desiredAssetIds.filter(id => currentSet.has(id));

  const currentApLevel = extractPolicyLevel(currentAp.data);
  const currentCpLevel = extractPolicyLevel(currentCp.data);
  const desiredApLevel = ap.level || 'Custom';
  const desiredCpLevel = cp.level || 'Custom';

  return {
    currentCd: currentCd.found ? { id: contractDefId, assetCount: currentAssetIds.length } : null,
    policies: {
      access: { current: currentApLevel, desired: desiredApLevel, changed: currentApLevel !== desiredApLevel },
      contract: { current: currentCpLevel, desired: desiredCpLevel, changed: currentCpLevel !== desiredCpLevel },
    },
    assets: {
      added: addedAssets,
      removed: removedAssets,
      kept: keptAssets,
      totalCurrent: currentAssetIds.length,
      totalDesired: desiredAssetIds.length,
    },
    hasChanges: addedAssets.length > 0 || removedAssets.length > 0 || currentApLevel !== desiredApLevel || currentCpLevel !== desiredCpLevel,
  };
}

function extractPolicyLevel(policyData) {
  if (!policyData) return 'unknown';
  const perms = policyData.policy?.['odrl:permission'] || policyData.policy?.permission || {};
  const constraint = perms?.['odrl:constraint'] || perms?.constraint;
  if (!constraint) return '1';
  return 'Custom';
}

async function reconcile(config) {
  const {
    edcUrl, edcApiKey, apiName, apiVersion, serviceBaseUrl,
    accessPolicy, contractPolicy, operations, basePath, description,
    contentType,
    authMode, authKey, authCode, vaultAuthKey, secretName,
    oauth2TokenUrl, oauth2ClientId, oauth2ClientSecretKey,
    history, serviceOfferingUrl,
  } = config;

  const slug = slugify(apiName);
  const prefix = `${slug}-`;
  const fullUrl = (serviceBaseUrl || '').replace(/\/$/, '') + (basePath || '');
  const headers = { 'Content-Type': 'application/json', 'X-Api-Key': edcApiKey };
  const ap = accessPolicy || {};
  const cp = contractPolicy || {};

  const accessPolicyId = `${prefix}access-policy`;
  const contractPolicyId = `${prefix}contract-policy`;
  const contractDefId = config.contractDefId || `${prefix}contract-def`;
  const prevAssetIds = new Set((history?.resources?.assets || []).map(a => a.id));

  const cdDeleteResult = await removeResource('contractdefinitions', contractDefId, headers, edcUrl);
  const hasActiveAgreement = cdDeleteResult.status === 'error' && cdDeleteResult.httpCode === 409;

  const conflictResolution = config.conflictResolution || null;
  if (hasActiveAgreement && !conflictResolution) {
    const diff = await buildConflictDiff({
      contractDefId, accessPolicyId, contractPolicyId,
      ap, cp, operations, prefix, headers, edcUrl,
    });
    return {
      conflict: true, slug,
      contractDefId, accessPolicyId, contractPolicyId,
      message: 'Contract Definition is locked by an active agreement',
      diff,
    };
  }

  const treatAsLocked = hasActiveAgreement && conflictResolution !== 'force-replace';

  const accessPolicyPayload = buildPolicyPayload(accessPolicyId, ap);
  const contractPolicyPayload = buildPolicyPayload(contractPolicyId, cp);
  const accessPolicyResult = await reconcilePolicies(accessPolicyId, accessPolicyPayload, treatAsLocked, headers, edcUrl);
  const contractPolicyResult = await reconcilePolicies(contractPolicyId, contractPolicyPayload, treatAsLocked, headers, edcUrl);

  if (accessPolicyResult.status === 'error' || contractPolicyResult.status === 'error') {
    return {
      policyError: true, slug,
      accessPolicy: { id: accessPolicyId, level: ap.level, result: accessPolicyResult, payload: accessPolicyPayload },
      contractPolicy: { id: contractPolicyId, level: cp.level, result: contractPolicyResult, payload: contractPolicyPayload },
    };
  }

  const includedOps = operations.filter(o => o.included !== false);
  const assetCfg = {
    apiName, apiVersion, description, fullUrl, contentType, ap, cp,
    authMode, authKey, authCode, vaultAuthKey, secretName,
    oauth2TokenUrl, oauth2ClientId, oauth2ClientSecretKey,
    serviceOfferingUrl,
  };
  const { assetIds, assetsDetail, deletedAssets } = await reconcileAssets(
    includedOps, prefix, prevAssetIds, assetCfg, headers, edcUrl,
  );

  const useNewVersion = treatAsLocked;
  const cdResult = await reconcileContractDef(
    contractDefId, accessPolicyId, contractPolicyId, assetIds, useNewVersion, headers, edcUrl,
  );

  return {
    hasActiveAgreement, slug, fullUrl, includedOps,
    ap, cp, accessPolicyId, contractPolicyId, contractDefId,
    accessPolicyPayload, contractPolicyPayload, accessPolicyResult, contractPolicyResult,
    assetIds, assetsDetail, deletedAssets, cdResult,
  };
}

module.exports = { reconcile };
