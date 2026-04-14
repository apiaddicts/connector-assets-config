const GAIAX_CONTEXT = 'https://w3id.org/gaia-x/gaia-x-trust-framework#';

function addIfPresent(target, key, value) {
  if (value !== undefined && value !== null && value !== '') {
    target[key] = value;
  }
}

function mapToGaiaxProperties(cfg) {
  const props = {};

  // LegalParticipant — required
  addIfPresent(props, 'gx:legalName', cfg.legalName);
  addIfPresent(props, 'gx:providedBy', cfg.providerDid);
  addIfPresent(props, 'gx:headquarterAddress.countryCode', cfg.country);
  addIfPresent(props, 'gx:legalAddress.countryCode', cfg.legalAddressCountry);

  // LegalRegistrationNumber — required (flat key per type)
  if (cfg.legalRegType && cfg.legalRegValue) {
    props[`gx:legalRegistrationNumber.${cfg.legalRegType}`] = cfg.legalRegValue;
  }

  // SoftwareResource / DataResource — required
  addIfPresent(props, 'gx:copyrightOwner', cfg.copyrightOwner);
  addIfPresent(props, 'gx:license', cfg.licenseSpdx);

  // DataResource — required
  if (cfg.containsPII !== undefined && cfg.containsPII !== null) {
    props['gx:containsPII'] = cfg.containsPII;
  }

  // ServiceOffering — termsAndConditions (required: url + hash)
  addIfPresent(props, 'gx:termsAndConditions.url', cfg.termsUrl);
  addIfPresent(props, 'gx:termsAndConditions.hash', cfg.termsHash);

  // Optional enrichment fields
  addIfPresent(props, 'gx:contactEmail', cfg.contactEmail);
  addIfPresent(props, 'gx:dataSovereignty.dataLocation', cfg.dataLocation);
  addIfPresent(props, 'gx:keywords', cfg.keywords);
  addIfPresent(props, 'gx:language', cfg.language);
  addIfPresent(props, 'gx:creator', cfg.creator);

  return props;
}

module.exports = { GAIAX_CONTEXT, mapToGaiaxProperties };
