/**
 * OpenAPI file upload, parsing, and form auto-fill.
 * Depends on: utils.js, app.js (parsedSpec, extractedOps)
 */

function fillFromSpec(spec) {
  // Auto-fill fields with data-source attribute
  document.querySelectorAll('[data-source]').forEach(function(el) {
    var val = getNestedValue(spec, el.getAttribute('data-source'));
    if (val != null) {
      if (el.id === 'f_license' || el.id === 'f_dataLicense') val = spdxify(val);
      setField(el.id, val, true);
    }
  });

  // Generate asset prefix from title
  var slug = slugify(spec.info ? spec.info.title : '');
  if (slug) setField('f_assetPrefix', slug + '-', true);

  // Set issuance date to now
  var now = new Date();
  now.setSeconds(0, 0);
  document.getElementById('f_issuanceDate').value = now.toISOString().slice(0, 16);

  // Extract operations from paths
  extractedOps = [];
  var paths = spec.paths || {};
  for (var path in paths) {
    var methods = paths[path];
    for (var method in methods) {
      if (['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(method)) {
        var op = methods[method];
        extractedOps.push({
          method: method.toUpperCase(),
          path: path,
          operationId: op.operationId || method + '_' + path.replace(/\//g, '_').replace(/[{}]/g, ''),
          summary: op.summary || '',
          description: op.description || '',
          included: true
        });
      }
    }
  }

  renderOps();
  renderSummary(spec);

  // Open all sections
  document.querySelectorAll('.section').forEach(function(s) {
    s.classList.add('open');
    var t = s.querySelector('.section-toggle');
    if (t) t.textContent = '\u25BE';
  });

  // Attach ID suggestion listeners
  document.getElementById('f_issuer').addEventListener('input', suggestIds);
  document.getElementById('f_name').addEventListener('input', suggestIds);
  suggestIds();
}

function suggestIds() {
  var did = getVal('f_issuer');
  var name = slugify(getVal('f_name'));
  if (!did || !name) return;

  var domain = did.replace('did:web:', '');
  if (!document.getElementById('f_vcId').value)
    setField('f_vcId', 'https://' + domain + '/vcs/software/' + name, true);
  if (!document.getElementById('f_credentialSubjectId').value)
    setField('f_credentialSubjectId', 'https://' + domain + '/resources/' + name, true);
  if (!document.getElementById('f_serviceOfferingId').value)
    setField('f_serviceOfferingId', 'https://' + domain + '/vcs/service/' + name, true);
  if (!document.getElementById('f_dataResourceId').value)
    setField('f_dataResourceId', 'https://' + domain + '/vcs/data/' + name, true);
  if (!document.getElementById('f_infraId').value)
    setField('f_infraId', 'https://' + domain + '/vcs/infra/' + name + '-server-01', true);
}

function renderSummary(spec) {
  var info = spec.info || {};
  document.getElementById('summaryPanel').style.display = 'block';

  var rows = [
    ['Title', info.title || '\u2014'],
    ['Version', info.version || '\u2014'],
    ['License', info.license ? (info.license.name || info.license.url) : '\u2014'],
    ['Servers', (spec.servers || []).map(function(s) { return s.url; }).join(', ') || 'none'],
    ['Operations', extractedOps.length + ' (\u2192 ' + extractedOps.length + ' EDC Assets)'],
    ['Security schemes', Object.keys((spec.components && spec.components.securitySchemes) || {}).join(', ') || 'none']
  ];

  document.getElementById('summaryRows').innerHTML = rows.map(function(r) {
    return '<div class="summary-row"><span class="summary-key">' + r[0] + '</span><span class="summary-val">' + r[1] + '</span></div>';
  }).join('');
}

function renderOps() {
  var c = document.getElementById('operationsTable');
  if (!extractedOps.length) {
    c.innerHTML = '<p style="color:var(--muted);font-size:13px">No operations found.</p>';
    return;
  }

  var prefix = getVal('f_assetPrefix');
  var tbody = extractedOps.map(function(op, i) {
    return '<tr>' +
      '<td><input type="checkbox" ' + (op.included ? 'checked' : '') + ' onchange="extractedOps[' + i + '].included=this.checked"/></td>' +
      '<td><span class="method-badge m-' + op.method.toLowerCase() + '">' + op.method + '</span></td>' +
      '<td style="font-family:monospace;font-size:11px">' + op.path + '</td>' +
      '<td style="font-family:monospace;font-size:11px">' + prefix + op.operationId + '</td>' +
      '<td style="color:var(--muted);font-size:11px">' + op.summary + '</td>' +
    '</tr>';
  }).join('');

  c.innerHTML = '<table class="ops-table"><thead><tr>' +
    '<th>\u2713</th><th>Method</th><th>Path</th><th>operationId \u2192 EDC Asset ID</th><th>Summary</th>' +
    '</tr></thead><tbody>' + tbody + '</tbody></table>';
}

/**
 * Initialize file upload listeners (called once from app.js).
 */
function initUpload() {
  var fileInput = document.getElementById('fileInput');
  var uploadArea = document.getElementById('uploadArea');

  fileInput.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        parsedSpec = file.name.match(/\.ya?ml$/) ? jsyaml.load(ev.target.result) : JSON.parse(ev.target.result);
        fillFromSpec(parsedSpec);
        var s = document.getElementById('uploadStatus');
        s.style.display = 'block';
        s.textContent = '\u2713 Loaded: ' + file.name;
      } catch (err) {
        alert('Parse error: ' + err.message);
      }
    };
    reader.readAsText(file);
  });

  uploadArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    uploadArea.classList.add('drag');
  });

  uploadArea.addEventListener('dragleave', function() {
    uploadArea.classList.remove('drag');
  });

  uploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag');
    var f = e.dataTransfer.files[0];
    if (f) {
      fileInput.files = e.dataTransfer.files;
      fileInput.dispatchEvent(new Event('change'));
    }
  });

  // Re-render operations when asset prefix changes
  document.getElementById('f_assetPrefix').addEventListener('input', function() {
    if (extractedOps.length) renderOps();
  });
}
