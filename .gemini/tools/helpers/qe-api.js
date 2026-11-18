#!/usr/bin/env node
// Bounded, redacted summaries of Postman collections (v2.0/v2.1) and OpenAPI/Swagger JSON
// stored under docs/<project>/. Read-only. Run from the QEAgent project root.
//   qe-api.js outline <project> <docs-relative-path.json> [maxItems 1..200]
//   qe-api.js show    <project> <docs-relative-path.json> <index>
const fs = require('node:fs');
const { isProjectSlug, projectPath } = require('./qe-artifacts');

const [action, project, rel, extra] = process.argv.slice(2);
const MAX_FILE = 5 * 1024 * 1024;
const MAX_OUTPUT = 12 * 1024;
const SENSITIVE_KEY = /(pass(word)?|secret|token|api[-_]?key|auth|credential|session|cookie|bearer|private[-_]?key|client[-_]?secret)/i;
const VARIABLE_ONLY = /^\s*\{\{[^{}]+\}\}\s*$/;

function fail(message) { console.error(`qe-api: ${message}`); process.exit(2); }
if (!['outline', 'show'].includes(action)) fail('Usage: qe-api.js outline <project> <path.json> [maxItems] | show <project> <path.json> <index>. Paths are relative to docs/<project>/.');
if (!isProjectSlug(project)) fail('Provide a valid project slug.');
if (typeof rel !== 'string' || !/\.json$/i.test(rel)) fail('Provide a .json file path relative to docs/<project>/ (YAML specs: use qe-files.js search/read-lines).');

let file;
try { file = projectPath(process.cwd(), project, `docs/${project}/${rel}`); }
catch (error) { fail(error.message); }
if (!fs.existsSync(file) || !fs.statSync(file).isFile()) fail(`File not found: docs/${project}/${rel}`);
if (fs.statSync(file).size > MAX_FILE) fail(`File exceeds ${MAX_FILE} bytes.`);
let doc;
try { doc = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, '')); }
catch { fail('File is not valid JSON.'); }

const kind = doc && typeof doc === 'object' && (doc.openapi || doc.swagger) ? 'openapi'
  : doc && Array.isArray(doc.item) ? 'postman' : null;
if (!kind) fail('Unrecognized format: expected a Postman collection (top-level "item") or OpenAPI/Swagger ("openapi"/"swagger").');

// ---------- redaction ----------
function redactString(value) {
  if (typeof value !== 'string') return value;
  if (VARIABLE_ONLY.test(value)) return value;
  if (/^\s*(Bearer|Basic|Token)\s+\S+/i.test(value) || /^eyJ[\w-]+\.[\w-]+\./.test(value)) return '<redacted>';
  return value;
}
function redact(value, depth = 0) {
  if (depth > 12) return '<truncated>';
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 60).map(([key, item]) => {
      if (SENSITIVE_KEY.test(key) && !(typeof item === 'string' && VARIABLE_ONLY.test(item)) && (typeof item !== 'object' || item === null)) return [key, '<redacted>'];
      return [key, redact(item, depth + 1)];
    }));
  }
  return redactString(value);
}
function redactUrl(raw) {
  if (typeof raw !== 'string') return raw;
  const [base, query] = raw.split('?');
  if (!query) return base;
  const params = query.split('&').map((pair) => {
    const [name, value = ''] = pair.split('=');
    return `${name}=${VARIABLE_ONLY.test(value) || !value ? value : (SENSITIVE_KEY.test(name) ? '<redacted>' : value)}`;
  });
  return `${base}?${params.join('&')}`;
}
function clip(text, max) {
  if (typeof text !== 'string') text = JSON.stringify(text);
  if (text === undefined) return undefined;
  return text.length > max ? `${text.slice(0, max)}…<truncated ${text.length - max} chars>` : text;
}
function redactBodyText(raw) {
  if (typeof raw !== 'string') return raw;
  try { return JSON.stringify(redact(JSON.parse(raw))); }
  catch { return raw.replace(/("?(?:password|secret|token|api[-_]?key)"?\s*[:=]\s*)("[^"]*"|[^\s,&]+)/gi, '$1"<redacted>"'); }
}

// ---------- operation lists ----------
function postmanOps() {
  const ops = [];
  const walk = (items, folder) => {
    for (const item of items || []) {
      if (Array.isArray(item.item)) { walk(item.item, folder ? `${folder}/${item.name}` : item.name); continue; }
      if (!item.request) continue;
      const req = typeof item.request === 'string' ? { url: item.request, method: 'GET' } : item.request;
      const url = typeof req.url === 'string' ? req.url : req.url?.raw || [req.url?.host, req.url?.path].flat().filter(Boolean).join('/');
      ops.push({ item, req, folder: folder || null, name: item.name || null, method: (req.method || 'GET').toUpperCase(), url: redactUrl(url) });
    }
  };
  walk(doc.item, null);
  return ops;
}
function openapiOps() {
  const ops = [];
  const methods = ['get', 'put', 'post', 'delete', 'patch', 'head', 'options', 'trace'];
  for (const [route, pathItem] of Object.entries(doc.paths || {})) {
    for (const method of methods) {
      if (!pathItem?.[method]) continue;
      const op = pathItem[method];
      ops.push({ op, pathItem, folder: (op.tags || [])[0] || null, name: op.summary || op.operationId || null, method: method.toUpperCase(), url: route });
    }
  }
  return ops;
}
const ops = kind === 'postman' ? postmanOps() : openapiOps();

function emit(result) {
  let text = JSON.stringify(result);
  if (Buffer.byteLength(text, 'utf8') > MAX_OUTPUT) fail(`Result exceeds ${MAX_OUTPUT} bytes; lower maxItems or use show for one operation.`);
  console.log(text);
}

if (action === 'outline') {
  const max = extra === undefined ? 100 : Number(extra);
  if (!Number.isInteger(max) || max < 1 || max > 200) fail('maxItems must be 1..200.');
  const list = ops.slice(0, max).map((entry, index) => {
    const base = { index, folder: entry.folder, name: clip(entry.name, 80), method: entry.method, url: clip(entry.url, 160) };
    if (kind === 'postman') {
      const codes = (entry.item.response || []).map((r) => r.code).filter(Boolean);
      return { ...base, bodyMode: entry.req.body?.mode || null, exampleCodes: [...new Set(codes)], hasTestScript: (entry.item.event || []).some((e) => e.listen === 'test') };
    }
    return { ...base, operationId: entry.op.operationId || null, responseCodes: Object.keys(entry.op.responses || {}), hasRequestBody: Boolean(entry.op.requestBody) };
  });
  const info = kind === 'postman'
    ? { title: doc.info?.name || null, schema: doc.info?.schema || null, collectionAuthType: doc.auth?.type || null, variables: (doc.variable || []).map((v) => v.key).slice(0, 50) }
    : { title: doc.info?.title || null, version: doc.info?.version || null, spec: doc.openapi || doc.swagger, servers: (doc.servers || []).map((s) => s.url).slice(0, 5), securitySchemes: Object.keys(doc.components?.securitySchemes || doc.securityDefinitions || {}) };
  emit({ ok: true, project, path: `docs/${project}/${rel}`, kind, info, total: ops.length, truncated: ops.length > max, operations: list,
    note: kind === 'postman' ? 'Example responses are observed samples, not authoritative expected behavior. Environment values are never included.' : undefined });
} else {
  const index = Number(extra);
  if (!Number.isInteger(index) || index < 0 || index >= ops.length) fail(`Index must be 0..${ops.length - 1}.`);
  const entry = ops[index];
  let detail;
  if (kind === 'postman') {
    const { req, item } = entry;
    const tests = (item.event || []).filter((e) => e.listen === 'test').flatMap((e) => [].concat(e.script?.exec || []))
      .filter((line) => /pm\.(test|expect|response)/.test(line)).slice(0, 30).map((line) => clip(redactString(line.trim()), 200));
    detail = {
      auth: req.auth?.type || null,
      headers: (req.header || []).map((h) => ({ name: h.key, value: VARIABLE_ONLY.test(h.value || '') ? h.value : (SENSITIVE_KEY.test(h.key || '') ? '<redacted>' : clip(redactString(h.value), 80)) })).slice(0, 30),
      query: (typeof req.url === 'object' ? req.url.query || [] : []).map((q) => q.key).slice(0, 30),
      body: req.body ? { mode: req.body.mode, raw: req.body.raw ? clip(redactBodyText(req.body.raw), 3000) : undefined, fields: (req.body.urlencoded || req.body.formdata || []).map((f) => f.key).slice(0, 30) } : null,
      testAssertions: tests,
      examples: (item.response || []).slice(0, 5).map((r) => ({ name: clip(r.name, 80), code: r.code || null, status: r.status || null, body: r.body ? clip(redactBodyText(r.body), 1500) : null, authority: 'observed example only' }))
    };
  } else {
    const { op, pathItem } = entry;
    const params = [...(pathItem.parameters || []), ...(op.parameters || [])].slice(0, 40).map((p) => p.$ref ? { $ref: p.$ref } : { name: p.name, in: p.in, required: Boolean(p.required), schema: p.schema ? clip(JSON.stringify(p.schema), 200) : (p.type || null) });
    detail = {
      operationId: op.operationId || null,
      security: op.security || doc.security || null,
      parameters: params,
      requestBody: op.requestBody ? clip(JSON.stringify(redact(op.requestBody)), 3000) : null,
      responses: Object.fromEntries(Object.entries(op.responses || {}).slice(0, 15).map(([code, r]) => [code, { description: clip(r.description || '', 200), content: r.content ? clip(JSON.stringify(redact(r.content)), 1200) : (r.schema ? clip(JSON.stringify(r.schema), 1200) : null) }]))
    };
  }
  emit({ ok: true, project, path: `docs/${project}/${rel}`, kind, index, folder: entry.folder, name: entry.name, method: entry.method, url: entry.url, ...detail });
}
