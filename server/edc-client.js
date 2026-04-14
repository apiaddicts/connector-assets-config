async function edcGet(url, headers) {
  try {
    const resp = await fetch(url, { method: 'GET', headers });
    if (resp.ok) {
      const text = await resp.text();
      let body;
      try { body = JSON.parse(text); } catch { body = text; }
      return { found: true, data: body, httpCode: resp.status };
    }
    return { found: false, httpCode: resp.status };
  } catch {
    return { found: false, httpCode: 0 };
  }
}

async function edcPut(url, payload, headers) {
  try {
    const resp = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });
    if (resp.ok || resp.status === 204) {
      return { status: 'updated', httpCode: resp.status };
    }
    const text = await resp.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    const errorDetail = typeof body === 'object' ? (body.errorDetail || body.message || '') : body;
    return { status: 'error', httpCode: resp.status, error: String(errorDetail).slice(0, 300) };
  } catch (err) {
    return { status: 'error', httpCode: 0, error: err.message };
  }
}

async function edcDelete(url, headers) {
  try {
    const resp = await fetch(url, { method: 'DELETE', headers });
    if (resp.ok || resp.status === 204) {
      return { status: 'deleted', httpCode: resp.status };
    }
    if (resp.status === 404) {
      return { status: 'not_found', httpCode: 404 };
    }
    const text = await resp.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    const errorDetail = typeof body === 'object' ? (body.errorDetail || body.message || '') : body;
    return { status: 'error', httpCode: resp.status, error: String(errorDetail).slice(0, 300) };
  } catch (err) {
    return { status: 'error', httpCode: 0, error: err.message };
  }
}

async function edcPost(url, payload, headers) {
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }

    if (resp.ok) {
      return { status: 'created', httpCode: resp.status };
    }

    const errorDetail = typeof body === 'object' ? (body.errorDetail || body.message || '') : body;
    if (resp.status === 409 || (typeof errorDetail === 'string' && errorDetail.toLowerCase().includes('already exists'))) {
      return { status: 'exists', httpCode: resp.status };
    }

    return { status: 'error', httpCode: resp.status, error: String(errorDetail).slice(0, 300) };
  } catch (err) {
    return { status: 'error', httpCode: 0, error: err.message };
  }
}

async function ensureResource(endpoint, resourceId, payload, headers, edcUrl) {
  const url = `${edcUrl}/${endpoint}/${encodeURIComponent(resourceId)}`;
  const existing = await edcGet(url, headers);

  if (existing.found) {
    const del = await edcDelete(url, headers);
    if (del.status === 'deleted') {
      const created = await edcPost(`${edcUrl}/${endpoint}`, payload, headers);
      return created.status === 'created'
        ? { status: 'updated', httpCode: created.httpCode }
        : created;
    }
    return { status: 'exists', httpCode: existing.httpCode };
  }

  return await edcPost(`${edcUrl}/${endpoint}`, payload, headers);
}

async function removeResource(endpoint, resourceId, headers, edcUrl) {
  const url = `${edcUrl}/${endpoint}/${encodeURIComponent(resourceId)}`;
  return await edcDelete(url, headers);
}

module.exports = { edcGet, edcPost, edcPut, edcDelete, ensureResource, removeResource };
