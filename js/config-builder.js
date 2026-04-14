/**
 * Builds the full Gaia-X + EDC configuration JSON from form values.
 * Depends on: utils.js, policy-library.js, policy.js, app.js (state)
 */

function getPolicyId(type) {
  if (currentPolicyMode === 'preset') {
    var accessId = getVal('f_presetPolicy');
    if (type === 'contract') {
      var contractVal = getVal('f_presetContractPolicy');
      return contractVal === 'same' ? accessId : contractVal;
    }
    return accessId;
  }
  if (currentPolicyMode === 'clone')  return getVal('f_clonePolicyId');
  if (currentPolicyMode === 'custom') return getVal('f_customPolicyId');
  return '';
}

function buildPolicyConfig() {
  var legalFramework = {
    governingLaw:  getVal('f_governingLaw')  || null,
    arbitration:   getVal('f_arbitration')    || null,
    legalTemplate: getVal('f_legalTemplate')  || null
  };

  if (currentPolicyMode === 'preset') {
    var policyId = getVal('f_presetPolicy');
    var policy = POLICY_LIBRARY[policyId];
    var contractPolicyVal = getVal('f_presetContractPolicy');
    return {
      mode: 'preset',
      accessPolicyId: policyId,
      contractPolicyId: contractPolicyVal === 'same' ? policyId : contractPolicyVal,
      name: policy ? policy.name : policyId,
      odrl: policy ? policy.odrl : null,
      createNew: false,
      legalFramework: legalFramework
    };
  }

  if (currentPolicyMode === 'clone') {
    var odrl = buildOdrlFromClone();
    return {
      mode: 'clone',
      clonedFrom: getVal('f_cloneBase'),
      policyId: getVal('f_clonePolicyId'),
      name: getVal('f_clonePolicyName'),
      odrl: odrl,
      createNew: true,
      legalFramework: legalFramework
    };
  }

  if (currentPolicyMode === 'custom') {
    var customOdrl = null;
    try { customOdrl = JSON.parse(getVal('f_customOdrl')); } catch(e) { /* handled by validation */ }
    return {
      mode: 'custom',
      policyId: getVal('f_customPolicyId'),
      name: getVal('f_customPolicyName'),
      odrl: customOdrl,
      createNew: true,
      legalFramework: legalFramework
    };
  }
}

function buildConfig() {
  var baseUrl  = getVal('f_serviceBaseUrl');
  var basePath = getVal('f_openApiBasePath');
  var prefix   = getVal('f_assetPrefix');

  var issuanceDate = getVal('f_issuanceDate')
    ? new Date(getVal('f_issuanceDate')).toISOString()
    : new Date().toISOString();
  var validUntil = getVal('f_validUntil')
    ? new Date(getVal('f_validUntil')).toISOString()
    : null;

  var ops = extractedOps.filter(function(o) { return o.included; });
  var swPolicies = Array.from(document.querySelectorAll('#swPoliciesList .dynamic-item input'))
    .map(function(i) { return i.value; })
    .filter(Boolean);

  var config = {
    meta: {
      generatedAt: new Date().toISOString(),
      specTitle:   parsedSpec && parsedSpec.info ? parsedSpec.info.title   : null,
      specVersion: parsedSpec && parsedSpec.info ? parsedSpec.info.version : null
    },

    provider: {
      did: getVal('f_issuer'),
      legalName: getVal('f_legalName'),
      shortName: getVal('f_orgName') || null,
      country: getVal('f_country').toUpperCase(),
      registrationNumber: {
        vatID:   getVal('f_vatId')    || null,
        leiCode: getVal('f_leiCode')  || null,
        EORI:    getVal('f_eoriCode') || null
      },
      address: getVal('f_street') ? {
        street:     getVal('f_street'),
        postalCode: getVal('f_postalCode'),
        city:       getVal('f_city'),
        regionCode: getVal('f_regionCode'),
        country:    getVal('f_country').toUpperCase()
      } : null,
      parentOrganization: getVal('f_parentOrg') || null,
      compliance: getVal('f_complianceLabel') ? {
        complianceLabel:      getVal('f_complianceLabel'),
        certifiedBy:          'did:web:compliance.gaia-x.eu',
        trustFrameworkVersion: getVal('f_trustFrameworkVersion') || '24.04'
      } : null
    },

    softwareResource: {
      vcId: getVal('f_vcId'),
      credentialSubjectId: getVal('f_credentialSubjectId'),
      issuanceDate: issuanceDate,
      name:        getVal('f_name'),
      description: getVal('f_description') || null,
      version:     getVal('f_version'),
      license:       [getVal('f_license')],
      copyrightOwner: getVal('f_copyrightOwner'),
      contact: {
        email: getVal('f_contactEmail') || null,
        url:   getVal('f_contactUrl')   || null
      },
      softwareReference:   getVal('f_softwareRef')     || null,
      programmingLanguage: getVal('f_progLang')         || null,
      checksum:            getVal('f_checksum')         || null,
      format:              getVal('f_resourceFormat')   || 'application/json',
      contract: {
        negotiationLink: getVal('f_negotiationLink') || null,
        sla:             getVal('f_slaUrl')           || null
      },
      technicalInterface: {
        interfaceType: parsedSpec
          ? 'OpenAPI ' + (parsedSpec.openapi || parsedSpec.swagger || '3.0')
          : 'OpenAPI 3.0',
        endpoint: basePath.startsWith('http')
          ? basePath
          : (baseUrl.replace(/\/$/, '') + (basePath || '')),
        operations: ops.map(function(o) {
          return { method: o.method, path: o.path, operationId: o.operationId, summary: o.summary || null };
        })
      },
      policy: swPolicies.length ? swPolicies : null
    },

    serviceOffering: getVal('f_serviceOfferingId') ? {
      vcId: getVal('f_serviceOfferingId'),
      providedBy: getVal('f_issuer'),
      termsAndConditions: {
        url:  getVal('f_termsUrl')  || null,
        hash: getVal('f_termsHash') || null
      },
      dataSovereignty: getVal('f_serviceDataLocation') ? {
        dataLocation: getVal('f_serviceDataLocation'),
        isSovereign:  getVal('f_isSovereign') === 'true'
      } : null,
      complianceLabel: getVal('f_serviceComplianceLevel') ? {
        level:       getVal('f_serviceComplianceLevel'),
        certifiedBy: 'did:web:compliance.gaia-x.eu'
      } : null,
      description: getVal('f_serviceDesc') || null,
      aggregationOf: [
        getVal('f_vcId')             ? { id: getVal('f_vcId'),             type: 'SoftwareResource' }       : null,
        getVal('f_dataResourceId')   ? { id: getVal('f_dataResourceId'),   type: 'DataResource' }           : null,
        getVal('f_infraId')          ? { id: getVal('f_infraId'),          type: 'InfrastructureResource' }  : null
      ].filter(Boolean)
    } : null,

    dataResource: getVal('f_dataResourceId') ? {
      vcId:            getVal('f_dataResourceId'),
      name:            getVal('f_dataName')             || null,
      description:     getVal('f_dataDescription')      || null,
      copyrightOwner:  getVal('f_dataCopyrightOwner')   || null,
      license:         getVal('f_dataLicense') ? [getVal('f_dataLicense')] : null,
      containsPII:     getVal('f_containsPersonalData') !== '' ? getVal('f_containsPersonalData') === 'true' : null,
      dataAccountability: getVal('f_dataAccountability') || null,
      exposedAttributes: getVal('f_exposedAttributes') ? JSON.parse(getVal('f_exposedAttributes')) : null,
      privacy: (getVal('f_processingBasis') || getVal('f_anonymization')) ? {
        processingBasis: getVal('f_processingBasis') || null,
        anonymization:   getVal('f_anonymization')   || null
      } : null
    } : null,

    infrastructureResource: getVal('f_infraId') ? {
      vcId:           getVal('f_infraId'),
      name:           getVal('f_infraName')             || null,
      description:    getVal('f_infraDesc')             || null,
      copyrightOwner: getVal('f_infraCopyrightOwner')   || null,
      license:        getVal('f_infraLicense') ? [getVal('f_infraLicense')] : null,
      nodeInfo: {
        serviceType:    getVal('f_infraServiceType')    || null,
        location:       getVal('f_infraLocation')       || null,
        resourceType:   getVal('f_infraResourceType')   || null,
        databaseEngine: getVal('f_dbEngine')            || null
      },
      technicalAttributes: (getVal('f_cpuCores') || getVal('f_ramGb')) ? {
        cpuCores:    getVal('f_cpuCores') ? parseInt(getVal('f_cpuCores')) : null,
        ramGb:       getVal('f_ramGb')    ? parseInt(getVal('f_ramGb'))    : null,
        storageType: getVal('f_storageType')  || null,
        networkZone: getVal('f_networkZone')  || null
      } : null
    } : null,

    contractDefinition: getVal('f_contractName') ? {
      vcId: baseUrl.replace(/\/$/, '') + '/contracts/' + slugify(getVal('f_contractName')),
      contractName:  getVal('f_contractName'),
      contractId:    getVal('f_contractId')     || null,
      status:        getVal('f_contractStatus') || 'Active',
      offeringModel: getVal('f_offeringModel')  || null,
      parties: {
        provider: getVal('f_issuer'),
        consumer: getVal('f_consumerDid') || null
      },
      termsAndConditions: {
        url:  getVal('f_termsUrl')  || null,
        hash: getVal('f_termsHash') || null
      },
      serviceLevels: [
        getVal('f_slaAvailability') ? { metric: 'availability',  targetValue: parseFloat(getVal('f_slaAvailability')), unit: 'ratio',               measurementWindow: getVal('f_slaWindow') } : null,
        getVal('f_slaLatency')      ? { metric: 'latency_p95',   targetValue: parseInt(getVal('f_slaLatency')),        unit: 'milliseconds',         measurementWindow: getVal('f_slaWindow') } : null,
        getVal('f_slaRateLimit')    ? { metric: 'rate_limit',    targetValue: parseInt(getVal('f_slaRateLimit')),      unit: 'requests_per_minute' } : null
      ].filter(Boolean),
      billing: getVal('f_billingModel') ? { model: getVal('f_billingModel') } : null,
      termination: getVal('f_noticePeriod') ? {
        noticePeriod: getVal('f_noticePeriod'),
        governingLaw: getVal('f_governingLaw') || null
      } : null
    } : null,

    policy: buildPolicyConfig(),

    edc: {
      managementUrl:    getVal('f_edcUrl'),
      apiKey:           getVal('f_edcApiKey'),
      assetPrefix:      prefix,
      contentType:      getVal('f_contentType') || 'application/json',
      protocol:         getVal('f_edcProtocol'),
      authType:         getVal('f_authType'),
      accessPolicyId:   getPolicyId('access'),
      contractPolicyId: getPolicyId('contract'),
      assets: ops.map(function(op) {
        return {
          id: prefix + op.operationId,
          operationId: op.operationId,
          method: op.method,
          path: op.path,
          summary: op.summary || null,
          dataAddress: {
            type:            getVal('f_edcProtocol'),
            baseUrl:         (baseUrl.replace(/\/$/, '') + op.path).replace(/\{[^}]+\}/g, '*'),
            method:          op.method,
            proxyPath:       'true',
            proxyQueryParams: 'true',
            proxyMethod:     'true',
            proxyBody:       ['POST', 'PUT', 'PATCH'].includes(op.method) ? 'true' : 'false'
          }
        };
      })
    }
  };

  // Add expirationDate only if set
  if (validUntil) config.softwareResource.expirationDate = validUntil;

  return config;
}
