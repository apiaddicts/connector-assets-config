function buildHeaders(config) {
  const headers = { 'Content-Type': 'application/json' };
  if (config.gnapToken) {
    headers['Authorization'] = `GNAP ${config.gnapToken}`;
  }
  return headers;
}

async function rainbowPost(url, payload, headers) {
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
      const id = typeof body === 'object' ? (body['@id'] || body.id || null) : null;
      return { status: 'created', httpCode: resp.status, id, data: body };
    }

    const errorDetail = typeof body === 'object' ? (body.message || body.error || '') : body;
    return { status: 'error', httpCode: resp.status, error: String(errorDetail).slice(0, 300) };
  } catch (err) {
    return { status: 'error', httpCode: 0, error: err.message };
  }
}

async function rainbowGet(url, headers) {
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

async function rainbowDelete(url, headers) {
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
    const errorDetail = typeof body === 'object' ? (body.message || body.error || '') : body;
    return { status: 'error', httpCode: resp.status, error: String(errorDetail).slice(0, 300) };
  } catch (err) {
    return { status: 'error', httpCode: 0, error: err.message };
  }
}

async function rainbowPut(url, payload, headers) {
  try {
    const resp = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });
    if (resp.ok || resp.status === 202) {
      return { status: 'updated', httpCode: resp.status };
    }
    const text = await resp.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    const errorDetail = typeof body === 'object' ? (body.message || body.error || '') : body;
    return { status: 'error', httpCode: resp.status, error: String(errorDetail).slice(0, 300) };
  } catch (err) {
    return { status: 'error', httpCode: 0, error: err.message };
  }
}

module.exports = { buildHeaders, rainbowPost, rainbowGet, rainbowDelete, rainbowPut };
