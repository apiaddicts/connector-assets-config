/**
 * Shared utility functions used across all modules.
 */

function slugify(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getNestedValue(obj, path) {
  return path.split('.').reduce(function(a, k) {
    return a == null ? undefined : isNaN(k) ? a[k] : a[parseInt(k)];
  }, obj);
}

function spdxify(url) {
  if (!url) return '';
  var map = {
    'apache.org/licenses/LICENSE-2.0': 'https://spdx.org/licenses/Apache-2.0.html',
    'apache-2.0': 'https://spdx.org/licenses/Apache-2.0.html',
    'mit-license': 'https://spdx.org/licenses/MIT.html',
    '/mit': 'https://spdx.org/licenses/MIT.html',
    'gpl-3': 'https://spdx.org/licenses/GPL-3.0-only.html',
    'gpl-2': 'https://spdx.org/licenses/GPL-2.0-only.html',
    'bsd-2': 'https://spdx.org/licenses/BSD-2-Clause.html',
    'bsd-3': 'https://spdx.org/licenses/BSD-3-Clause.html',
    'cc-by-4': 'https://spdx.org/licenses/CC-BY-4.0.html',
    'cc0': 'https://spdx.org/licenses/CC0-1.0.html'
  };
  var l = url.toLowerCase();
  for (var k in map) {
    if (l.includes(k)) return map[k];
  }
  return url;
}

function setField(id, val, auto) {
  var el = document.getElementById(id);
  if (!el || val == null || val === '') return;
  el.value = val;
  if (auto) el.classList.add('autofilled');
}

function getVal(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function markError(id, show) {
  var el = document.getElementById(id);
  var err = document.getElementById('err_' + id.replace('f_', ''));
  if (!el) return;
  el.classList.toggle('error', show);
  if (err) err.style.display = show ? 'block' : 'none';
}
