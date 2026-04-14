function buildCatalogPayload(apiName, serviceBaseUrl, cfg) {
  const payload = {
    'foaf:homepage': serviceBaseUrl || '',
    'dct:title': apiName,
  };
  if (cfg.keywords) payload['dcat:theme'] = cfg.keywords;
  if (cfg.creator) payload['dct:creator'] = cfg.creator;
  if (cfg.description) payload['dct:description'] = cfg.description;
  return payload;
}

function buildDataServicePayload(endpointUrl, apiName, description) {
  const payload = {
    'dcat:endpointURL': endpointUrl,
    'dct:title': apiName,
  };
  if (description) payload['dcat:endpointDescription'] = description;
  return payload;
}

function buildDatasetPayload(op, cfg) {
  const payload = {
    'dct:title': `${cfg.apiName} - ${op.summary || op.operationId}`,
    'dct:conformsTo': cfg.serviceOfferingUrl || 'https://gaia-x.eu/trust-framework/2024',
  };
  if (cfg.creator) payload['dct:creator'] = cfg.creator;
  return payload;
}

function buildDistributionPayload(dataServiceId, format) {
  return {
    'dcat:accessService': dataServiceId,
    'dct:formats': format || 'http+pull',
    'dct:title': format || 'http+pull',
  };
}

module.exports = { buildCatalogPayload, buildDataServicePayload, buildDatasetPayload, buildDistributionPayload };
