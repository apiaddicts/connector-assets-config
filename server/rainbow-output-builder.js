function buildRainbowOutput(config, r) {
  const {
    apiName, apiVersion, serviceBaseUrl, basePath, description,
    providerDid, legalName, copyrightOwner, licenseSpdx,
    contactEmail, termsUrl, termsHash, country,
    legalAddressCountry, legalRegType, legalRegValue,
    containsPII, dataLocation,
    keywords, language, contentType, creator,
    operations,
  } = config;

  const countDatasets = (st) => r.datasetsDetail.filter(d => d.dataset.status === st).length;
  const countDistributions = (st) => r.datasetsDetail.filter(d => d.distribution?.status === st).length;
  const countPolicies = (st) => r.datasetsDetail.filter(d => d.policy?.status === st).length;
  const ts = new Date().toISOString();

  const hasErrors = r.datasetsDetail.some(d =>
    d.dataset.status === 'error' || d.distribution?.status === 'error' || d.policy?.status === 'error'
  );

  return {
    timestamp: ts,
    connectorType: 'rainbow',
    success: !hasErrors && (r.catalogResult.status === 'created' || r.catalogResult.status === 'updated'),

    config: {
      connectorUrl: config.edcUrl,
      serviceOfferingUrl: config.serviceOfferingUrl || null,
      apiName,
      apiVersion: apiVersion || '1.0.0',
      serviceBaseUrl,
      basePath: basePath || '',
      fullUpstreamUrl: r.fullUrl,
      policy: {
        level: r.cp.level || null,
        constraints: (r.cp.constraints || []).filter(c => c.leftOperand && c.rightOperand),
        prohibitions: r.cp.prohibitions || [],
        obligations: r.cp.obligations || [],
      },
      description: description || null,
      provider: {
        did: providerDid || null, legalName: legalName || null,
        copyrightOwner: copyrightOwner || null, licenseSpdx: licenseSpdx || null,
        contactEmail: contactEmail || null, termsUrl: termsUrl || null,
        termsHash: termsHash || null,
        headquarterCountry: country || null,
        legalAddressCountry: legalAddressCountry || null,
        legalRegistrationNumber: legalRegType && legalRegValue
          ? { type: legalRegType, value: legalRegValue } : null,
      },
      resource: {
        containsPII: containsPII ?? null,
        dataLocation: dataLocation || null,
      },
      catalog: {
        keywords: keywords || null, language: language || null,
        contentType: contentType || null, creator: creator || null,
      },
      operationsIncluded: r.includedOps.length,
      operationsExcluded: operations.length - r.includedOps.length,
    },

    summary: {
      api: `${apiName} v${apiVersion || '1.0.0'}`,
      isUpdate: !!config.history?.resources?.catalog?.id,
      catalog: r.catalogResult.status,
      dataService: r.dataServiceResult.status,
      datasetsCreated: countDatasets('created'),
      datasetsUpdated: countDatasets('updated'),
      datasetsFailed: countDatasets('error'),
      datasetsDeleted: (r.deletedDatasets || []).filter(d => d.result.status === 'deleted').length,
      distributionsCreated: countDistributions('created'),
      distributionsUpdated: countDistributions('updated'),
      distributionsFailed: countDistributions('error'),
      policiesAttached: countPolicies('created'),
      policiesFailed: countPolicies('error'),
    },

    resources: {
      catalog: {
        id: r.catalogId,
        result: r.catalogResult,
      },
      dataService: {
        id: r.dataServiceId,
        result: r.dataServiceResult,
      },
      datasets: r.datasetsDetail,
      deletedDatasets: r.deletedDatasets || [],
      policyPayload: r.policyPayload,
    },
  };
}

module.exports = { buildRainbowOutput };
