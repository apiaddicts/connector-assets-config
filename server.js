const express = require('express');
const path = require('node:path');
const fs = require('node:fs');

const { parseOpenApiSpec } = require('./server/openapi-parser');
const { reconcile } = require('./server/reconciler');
const { buildOutput } = require('./server/output-builder');

const app = express();
const PORT = process.env.PORT || 3000;
const OUTPUT_DIR = path.join(__dirname, 'output');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/parse-openapi', (req, res) => {
  try {
    const { content, filename } = req.body;
    if (!content) return res.status(400).json({ error: 'No content provided' });
    res.json(parseOpenApiSpec(content, filename));
  } catch (err) {
    res.status(400).json({ error: `Failed to parse spec: ${err.message}` });
  }
});

app.post('/api/create-edc-resources', async (req, res) => {
  try {
    const config = req.body;
    if (!config.connectorType || !['edc', 'rainbow'].includes(config.connectorType)) {
      return res.status(400).json({ error: 'Missing or invalid connectorType. Must be "edc" or "rainbow"' });
    }
    const isEdc = config.connectorType === 'edc';

    if (isEdc && (!config.edcUrl || !config.edcApiKey || !config.apiName || !config.operations?.length)) {
      return res.status(400).json({ error: 'Missing required fields: edcUrl, edcApiKey, apiName, operations' });
    }
    if (!isEdc && (!config.edcUrl || !config.apiName || !config.operations?.length)) {
      return res.status(400).json({ error: 'Missing required fields: connectorUrl, apiName, operations' });
    }

    const result = await reconcile(config);

    if (result.rainbowError) {
      return res.status(502).json({
        rainbowError: true, phase: result.phase,
        error: result.error,
      });
    }

    if (result.conflict) {
      return res.status(409).json({
        conflict: true,
        contractDefId: result.contractDefId,
        accessPolicyId: result.accessPolicyId,
        contractPolicyId: result.contractPolicyId,
        message: result.message,
        diff: result.diff,
      });
    }

    if (result.policyError) {
      return res.status(422).json({
        policyError: true,
        accessPolicy: result.accessPolicy,
        contractPolicy: result.contractPolicy,
      });
    }

    const output = buildOutput(config, result);

    const filename = `${result.slug}-${output.timestamp.replaceAll(/[:.]/g, '-')}.json`;
    const filepath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
    output.savedTo = filename;

    // TODO: enviar archivo a APIQuality, luego eliminar:
    // await sendToApiQuality(filepath);
    // fs.unlinkSync(filepath);

    res.json(output);
  } catch (err) {
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
});

app.get('/api/service-offering', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: 'Missing url parameter' });
  try {
    const resp = await fetch(targetUrl, { headers: { Accept: 'application/json' } });
    if (!resp.ok) return res.status(resp.status).json({ error: `HTTP ${resp.status} fetching ${targetUrl}` });
    const data = await resp.json();
    const subjectType = data?.credentialSubject?.type;
    if (subjectType !== 'gx:ServiceOffering') {
      return res.status(422).json({ error: `Not a ServiceOffering VC (type: ${subjectType || 'unknown'})` });
    }
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: `Failed to fetch Service Offering: ${err.message}` });
  }
});

app.get('/api/rainbow-proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: 'Missing url parameter' });
  try {
    const resp = await fetch(targetUrl, { headers: { 'Content-Type': 'application/json' } });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: `Failed to reach Rainbow: ${err.message}` });
  }
});

app.get('/api/configs', (_req, res) => {
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.json')).sort().reverse();
  res.json(files);
});

app.get('/api/configs/:filename', (req, res) => {
  const filepath = path.join(OUTPUT_DIR, path.basename(req.params.filename));
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Not found' });
  res.sendFile(filepath);
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', version: '2.1.0' }));

app.listen(PORT, () => {
  console.log(`Gaia-X Config server running on port ${PORT}`);
});
