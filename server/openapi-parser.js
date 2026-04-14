const yaml = require('js-yaml');
const { extractBasePath } = require('./helpers');

function parseSpec(content, filename) {
  if (filename && (filename.endsWith('.yaml') || filename.endsWith('.yml'))) {
    return yaml.load(content);
  }
  return typeof content === 'string' ? JSON.parse(content) : content;
}

function extractOperations(spec) {
  const operations = [];
  for (const [pathStr, methods] of Object.entries(spec.paths || {})) {
    for (const [method, details] of Object.entries(methods)) {
      if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) continue;
      operations.push({
        method: method.toUpperCase(),
        path: pathStr,
        operationId: details.operationId || `${method}_${pathStr.replaceAll('/', '_').replaceAll(/[{}]/g, '')}`,
        summary: details.summary || '',
        description: details.description || '',
        tags: details.tags || [],
        included: true,
      });
    }
  }
  return operations;
}

function parseOpenApiSpec(content, filename) {
  const spec = parseSpec(content, filename);
  const info = spec.info || {};
  const operations = extractOperations(spec);

  return {
    title: info.title || '',
    version: info.version || '',
    description: info.description || '',
    license: info.license ? (info.license.url || info.license.name || '') : '',
    contact: info.contact ? (info.contact.email || '') : '',
    basePath: extractBasePath(spec.servers || []),
    operations,
    securitySchemes: spec.components?.securitySchemes ? Object.keys(spec.components.securitySchemes) : [],
  };
}

module.exports = { parseOpenApiSpec };
