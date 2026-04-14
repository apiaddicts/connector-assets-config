const { buildHeaders, rainbowPost, rainbowPut, rainbowDelete } = require('./rainbow-client');
const { buildCatalogPayload, buildDataServicePayload, buildDatasetPayload, buildDistributionPayload } = require('./rainbow-catalog-builder');
const { buildRainbowPolicy } = require('./rainbow-policy-builder');
const { slugify } = require('./helpers');

function buildUrl(baseUrl, ...segments) {
  return `${baseUrl}/api/v1/${segments.map(encodeURIComponent).join('/')}`;
}

async function ensureCatalog(baseUrl, prevId, apiName, serviceBaseUrl, headers, cfg) {
  const payload = buildCatalogPayload(apiName, serviceBaseUrl, cfg);
  if (prevId) {
    const url = buildUrl(baseUrl, 'catalogs', prevId);
    const result = await rainbowPut(url, payload, headers);
    return { payload, result, id: prevId };
  }
  const url = `${baseUrl}/api/v1/catalogs`;
  const result = await rainbowPost(url, payload, headers);
  return { payload, result, id: result.id };
}

async function ensureDataService(baseUrl, catalogId, prevId, endpointUrl, headers, apiName, description) {
  const payload = buildDataServicePayload(endpointUrl, apiName, description);
  if (prevId) {
    const url = buildUrl(baseUrl, 'catalogs', catalogId, 'data-services', prevId);
    const result = await rainbowPut(url, payload, headers);
    return { payload, result, id: prevId };
  }
  const url = buildUrl(baseUrl, 'catalogs', catalogId) + '/data-services';
  const result = await rainbowPost(url, payload, headers);
  return { payload, result, id: result.id };
}

async function createDataset(baseUrl, catalogId, op, cfg, headers) {
  const url = buildUrl(baseUrl, 'catalogs', catalogId) + '/datasets';
  const payload = buildDatasetPayload(op, cfg);
  const result = await rainbowPost(url, payload, headers);
  return { payload, result, id: result.id };
}

async function updateDataset(baseUrl, catalogId, datasetId, op, cfg, headers) {
  const url = buildUrl(baseUrl, 'catalogs', catalogId, 'datasets', datasetId);
  const payload = buildDatasetPayload(op, cfg);
  const result = await rainbowPut(url, payload, headers);
  return { payload, result, id: datasetId };
}

async function ensureDistribution(baseUrl, catalogId, datasetId, prevDistId, dataServiceId, headers, format) {
  const payload = buildDistributionPayload(dataServiceId, format);
  if (prevDistId) {
    const url = buildUrl(baseUrl, 'catalogs', catalogId, 'datasets', datasetId, 'distributions', prevDistId);
    const result = await rainbowPut(url, payload, headers);
    return { payload, result, id: prevDistId };
  }
  const url = buildUrl(baseUrl, 'catalogs', catalogId, 'datasets', datasetId) + '/distributions';
  const result = await rainbowPost(url, payload, headers);
  return { payload, result, id: result.id };
}

async function deletePolicy(baseUrl, datasetId, policyId, headers) {
  const url = buildUrl(baseUrl, 'datasets', datasetId, 'policies', policyId);
  return await rainbowDelete(url, headers);
}

async function attachPolicy(baseUrl, datasetId, policyPayload, headers) {
  const url = `${baseUrl}/api/v1/datasets/${encodeURIComponent(datasetId)}/policies`;
  const result = await rainbowPost(url, policyPayload, headers);
  return { payload: policyPayload, result, id: result.id };
}

async function deleteDataset(baseUrl, catalogId, datasetId, headers) {
  const url = buildUrl(baseUrl, 'catalogs', catalogId, 'datasets', datasetId);
  return await rainbowDelete(url, headers);
}

function buildPrevDatasetMap(history) {
  if (!history?.resources?.datasets) return new Map();
  const map = new Map();
  for (const ds of history.resources.datasets) {
    if (ds.operationId && ds.datasetId) {
      map.set(ds.operationId, ds);
    }
  }
  return map;
}

async function reconcile(config) {
  const {
    edcUrl: baseUrl, apiName, serviceBaseUrl,
    contractPolicy, operations, basePath, description,
    keywords, creator, history, transferFormat, serviceOfferingUrl,
  } = config;

  const slug = slugify(apiName);
  const fullUrl = (serviceBaseUrl || '').replace(/\/$/, '') + (basePath || '');
  const headers = buildHeaders(config);
  const cp = contractPolicy || {};
  const includedOps = operations.filter(o => o.included !== false);

  const prevCatalogId = history?.resources?.catalog?.id || null;
  const prevDataServiceId = history?.resources?.dataService?.id || null;
  const prevDatasets = buildPrevDatasetMap(history);

  const catalog = await ensureCatalog(baseUrl, prevCatalogId, apiName, serviceBaseUrl, headers, { keywords, creator, description });
  if (catalog.result.status === 'error') {
    return { rainbowError: true, slug, phase: 'catalog', error: catalog.result.error };
  }

  const dataService = await ensureDataService(baseUrl, catalog.id, prevDataServiceId, fullUrl, headers, apiName, description);
  if (dataService.result.status === 'error') {
    return { rainbowError: true, slug, phase: 'data-service', catalogId: catalog.id, error: dataService.result.error };
  }

  const datasetCfg = { apiName, creator, serviceOfferingUrl };
  const policyPayload = buildRainbowPolicy(cp);
  const datasetsDetail = [];
  const processedOpIds = new Set();

  for (const op of includedOps) {
    processedOpIds.add(op.operationId);
    const prev = prevDatasets.get(op.operationId);

    let dataset;
    if (prev) {
      dataset = await updateDataset(baseUrl, catalog.id, prev.datasetId, op, datasetCfg, headers);
    } else {
      dataset = await createDataset(baseUrl, catalog.id, op, datasetCfg, headers);
    }

    if (dataset.result.status === 'error') {
      datasetsDetail.push({
        operationId: op.operationId, method: op.method, path: op.path,
        summary: op.summary || '', dataset: dataset.result,
        distribution: null, policy: null,
      });
      continue;
    }

    const prevDistId = prev?.distributionId || null;
    const format = transferFormat || 'http+pull';
    const distribution = await ensureDistribution(baseUrl, catalog.id, dataset.id, prevDistId, dataService.id, headers, format);

    if (prev?.policyId) {
      await deletePolicy(baseUrl, dataset.id, prev.policyId, headers);
    }
    const policy = await attachPolicy(baseUrl, dataset.id, policyPayload, headers);

    datasetsDetail.push({
      operationId: op.operationId, method: op.method, path: op.path,
      summary: op.summary || '',
      datasetId: dataset.id,
      dataset: dataset.result,
      distributionId: distribution.id,
      distribution: distribution.result,
      policyId: policy.id,
      policy: policy.result,
    });
  }

  const deletedDatasets = [];
  for (const [opId, prev] of prevDatasets) {
    if (!processedOpIds.has(opId)) {
      const del = await deleteDataset(baseUrl, catalog.id, prev.datasetId, headers);
      deletedDatasets.push({ operationId: opId, datasetId: prev.datasetId, result: del });
    }
  }

  return {
    slug, fullUrl, includedOps, cp,
    catalogId: catalog.id,
    catalogResult: catalog.result,
    dataServiceId: dataService.id,
    dataServiceResult: dataService.result,
    datasetsDetail,
    policyPayload,
    deletedDatasets,
  };
}

module.exports = { reconcile };
