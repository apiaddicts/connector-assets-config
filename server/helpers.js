function slugify(s) {
  return (s || '').toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/^-|-$/g, '');
}

function extractBasePath(servers) {
  if (!servers?.length) return '';
  const url = servers[0].url || '';
  if (url.startsWith('/')) return url;
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
}

module.exports = { slugify, extractBasePath };
