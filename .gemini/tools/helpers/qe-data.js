#!/usr/bin/env node
// Reproducible, fictional fixture generator. Run from the QEAgent project root.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const [action, project, profile, countText, seedText, filename, ...options] = process.argv.slice(2);
function fail(message) { console.error(`qe-data: ${message}`); process.exit(2); }
function rejectSymlinks(targetPath) {
  let current = path.resolve(process.cwd());
  for (const part of path.relative(process.cwd(), targetPath).split(path.sep)) {
    if (!part || part === '.') continue;
    current = path.join(current, part);
    try { if (fs.lstatSync(current).isSymbolicLink()) fail('Symbolic links are not allowed in helper paths.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
if (action !== 'generate') fail('Usage: qe-data.js generate <project> <person|account|order|schema> <count 1..1000> <seed> <manual|automation>/<filename.json|filename.csv> [--schema docs/<project>/path.json] [--replace]');
if (!/^[A-Za-z0-9_-]+$/.test(project || '') || project === '.' || project === '..') fail('Invalid project slug.');
if (!['person', 'account', 'order', 'schema'].includes(profile)) fail('Choose a supported profile: person, account, order, or schema.');
const count = Number(countText);
if (!Number.isInteger(count) || count < 1 || count > 1000) fail('Count must be an integer from 1 to 1000.');
if (!seedText || seedText.length > 128) fail('Provide a non-empty seed of at most 128 characters.');
if (typeof filename !== 'string' || !/^(manual|automation)\/[A-Za-z0-9][A-Za-z0-9._-]{0,119}\.(json|csv)$/.test(filename)) fail('Filename must be manual/<name>.json|csv or automation/<name>.json|csv so the dataset is covered by that phase fingerprint.');
const replace = options.includes('--replace');
const schemaIndex = options.indexOf('--schema');
const schemaRelative = schemaIndex >= 0 ? options[schemaIndex + 1] : null;
if ((profile === 'schema') !== Boolean(schemaRelative)) fail('Use --schema <docs/<project>/...json or output/<project>/testdata/...json> exactly when profile is schema.');
const projectOutput = path.resolve(process.cwd(), 'output', project);
rejectSymlinks(projectOutput);
if (!fs.existsSync(projectOutput) || !fs.statSync(projectOutput).isDirectory()) fail(`Missing output/${project}/. Create the project with qe-project.js create first.`);
const root = path.join(projectOutput, 'testdata');
const target = path.resolve(root, filename);
if (!target.startsWith(root + path.sep)) fail('Output path escapes output/<project>/testdata/.');
rejectSymlinks(target);
const seed = crypto.createHash('sha256').update(seedText).digest().readUInt32LE(0);
let state = seed || 0x6d2b79f5;
function random() {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const firstNames = ['Alex', 'Casey', 'Jordan', 'Morgan', 'Riley', 'Sam', 'Taylor', 'Avery'];
const lastNames = ['Alder', 'Bennett', 'Cedar', 'Dawson', 'Ellis', 'Foster', 'Gray', 'Hayes'];
const pick = (values) => values[Math.floor(random() * values.length)];
let schema;
let schemaHash;
if (profile === 'schema') {
  const allowedPrefixes = [`docs/${project}/`, `output/${project}/testdata/`];
  if (path.isAbsolute(schemaRelative) || !allowedPrefixes.some((prefix) => schemaRelative.startsWith(prefix))) fail('Schema must be inside docs/<project>/ or output/<project>/testdata/.');
  const schemaPath = path.resolve(process.cwd(), schemaRelative);
  rejectSymlinks(schemaPath);
  const allowedSchemaRoots = [path.resolve(process.cwd(), 'docs', project), path.resolve(process.cwd(), 'output', project, 'testdata')].map((p) => p + path.sep);
  if (!allowedSchemaRoots.some((allowed) => schemaPath.startsWith(allowed)) || !fs.existsSync(schemaPath) || !fs.statSync(schemaPath).isFile()) fail('Schema file not found or outside the selected project docs/testdata folders.');
  const schemaBytes = fs.readFileSync(schemaPath);
  if (schemaBytes.length > 32 * 1024 || schemaBytes.includes(0)) fail('Schema must be UTF-8 JSON no larger than 32 KiB.');
  try { schema = JSON.parse(schemaBytes.toString('utf8')); } catch { fail('Schema file is invalid JSON.'); }
  if (!schema.fields || typeof schema.fields !== 'object' || Array.isArray(schema.fields)) fail('Schema must contain a fields object.');
  const entries = Object.entries(schema.fields);
  if (entries.length < 1 || entries.length > 40) fail('Schema must define between 1 and 40 fields.');
  const allowedTypes = ['string', 'integer', 'number', 'boolean', 'enum', 'email', 'phone', 'date', 'id'];
  const allowedKeys = {
    string: ['type', 'prefix', 'values', 'minLength', 'maxLength'], integer: ['type', 'min', 'max'],
    number: ['type', 'min', 'max', 'scale'], boolean: ['type'], enum: ['type', 'values'],
    email: ['type'], phone: ['type'], date: ['type', 'from', 'to'], id: ['type', 'prefix']
  };
  for (const [name, def] of entries) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(name) || !def || !allowedTypes.includes(def.type)) fail(`Invalid field definition: ${name}.`);
    if (Object.keys(def).some((key) => !allowedKeys[def.type].includes(key))) fail(`Unsupported constraint on field ${name}; supported keys for ${def.type}: ${allowedKeys[def.type].join(', ')}.`);
    if (def.type === 'enum' && (!Array.isArray(def.values) || def.values.length < 1 || def.values.length > 100 || def.values.some((v) => !['string', 'number', 'boolean'].includes(typeof v)))) fail(`Enum field ${name} needs 1..100 scalar values.`);
    if (['integer', 'number'].includes(def.type)) {
      def.min ??= 0; def.max ??= 100;
      if (!Number.isFinite(def.min) || !Number.isFinite(def.max) || def.min > def.max) fail(`Invalid numeric bounds for ${name}.`);
      if (def.type === 'integer' && (!Number.isInteger(def.min) || !Number.isInteger(def.max))) fail(`Integer bounds for ${name} must be whole numbers.`);
    }
    if (def.type === 'number' && def.scale !== undefined && (!Number.isInteger(def.scale) || def.scale < 0 || def.scale > 6)) fail(`Number scale for ${name} must be an integer from 0 to 6.`);
    if (def.type === 'date') {
      def.from ??= '2020-01-01'; def.to ??= '2030-12-31';
      const from = Date.parse(`${def.from}T00:00:00Z`); const to = Date.parse(`${def.to}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(def.from) || !/^\d{4}-\d{2}-\d{2}$/.test(def.to) || !Number.isFinite(from) || !Number.isFinite(to) || from > to || new Date(from).toISOString().slice(0, 10) !== def.from || new Date(to).toISOString().slice(0, 10) !== def.to) fail(`Invalid ISO date bounds for ${name}.`);
    }
    if (def.prefix !== undefined && (typeof def.prefix !== 'string' || !/^[A-Za-z0-9_.-]{1,32}$/.test(def.prefix))) fail(`Prefix for ${name} must be 1..32 letters, numbers, underscore, dot, or hyphen.`);
    if (def.type === 'string' && def.values !== undefined && (!Array.isArray(def.values) || !def.values.length || def.values.length > 100 || def.values.some((v) => typeof v !== 'string'))) fail(`String values for ${name} must be 1..100 strings.`);
    if (def.type === 'string') {
      def.minLength ??= 0; def.maxLength ??= 1000;
      if (!Number.isInteger(def.minLength) || !Number.isInteger(def.maxLength) || def.minLength < 0 || def.maxLength < def.minLength || def.maxLength > 1000) fail(`Invalid string length bounds for ${name}.`);
      if (def.values && def.values.some((v) => v.length < def.minLength || v.length > def.maxLength)) fail(`String enum values for ${name} violate its length bounds.`);
    }
  }
  schemaHash = crypto.createHash('sha256').update(schemaBytes).digest('hex');
}
const records = Array.from({ length: count }, (_, index) => {
  const number = String(index + 1).padStart(5, '0');
  if (schema) {
    const row = {};
    for (const [name, def] of Object.entries(schema.fields)) {
      if (def.type === 'string') {
        let value = def.values ? pick(def.values) : `${def.prefix || 'value'}-${number}`;
        value = value.padEnd(def.minLength, 'x').slice(0, def.maxLength);
        row[name] = value;
      }
      else if (def.type === 'integer') row[name] = Math.floor(random() * (def.max - def.min + 1)) + def.min;
      else if (def.type === 'number') {
        const scale = Number.isInteger(def.scale) && def.scale >= 0 && def.scale <= 6 ? def.scale : 2;
        const unit = Math.pow(10, scale);
        row[name] = Math.round((def.min + random() * (def.max - def.min)) * unit) / unit;
      } else if (def.type === 'boolean') row[name] = random() >= 0.5;
      else if (def.type === 'enum') row[name] = pick(def.values);
      else if (def.type === 'email') row[name] = `qe.user.${number}@example.invalid`;
      else if (def.type === 'phone') row[name] = `+1-202-555-01${String(index % 100).padStart(2, '0')}`;
      else if (def.type === 'date') {
        const from = Date.parse(`${def.from}T00:00:00Z`); const to = Date.parse(`${def.to}T00:00:00Z`);
        const days = Math.floor((to - from) / 86400000);
        row[name] = new Date(from + Math.floor(random() * (days + 1)) * 86400000).toISOString().slice(0, 10);
      } else if (def.type === 'id') row[name] = `${def.prefix || 'ID'}-${number}`;
    }
    return row;
  }
  const first = pick(firstNames);
  const last = pick(lastNames);
  const email = `${first.toLowerCase()}.${last.toLowerCase()}.${number}@example.invalid`;
  if (profile === 'person') return {
    id: `PER-${number}`, first_name: first, last_name: last, email,
    phone: `+1-202-555-01${String(index % 100).padStart(2, '0')}`,
    active: random() >= 0.2
  };
  if (profile === 'account') return {
    id: `ACC-${number}`, username: `qe_user_${number}`, email,
    status: pick(['active', 'pending', 'suspended']), plan: pick(['basic', 'standard', 'premium']),
    balance_cents: Math.floor(random() * 100000)
  };
  return {
    id: `ORD-${number}`, customer_email: email, sku: `SKU-${String(Math.floor(random() * 9000) + 1000)}`,
    quantity: Math.floor(random() * 10) + 1, amount_cents: Math.floor(random() * 50000) + 100,
    status: pick(['draft', 'placed', 'fulfilled', 'cancelled'])
  };
});
function csvCell(value) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
const contents = filename.toLowerCase().endsWith('.csv')
  ? `${Object.keys(records[0]).join(',')}\n${records.map((row) => Object.values(row).map(csvCell).join(',')).join('\n')}\n`
  : `${JSON.stringify(records, null, 2)}\n`;
if (Buffer.byteLength(contents, 'utf8') > 2 * 1024 * 1024) fail('Generated dataset exceeds 2 MiB; reduce record count or field lengths.');
const manifest = {
  generator: 'qe-data', generatorVersion: 1, project, profile, seed: seedText,
  count: records.length, output: path.relative(process.cwd(), target).replace(/\\/g, '/'),
  fields: Object.keys(records[0]), syntheticOnly: true, emailDomain: 'example.invalid',
  ...(schema ? { schema: schemaRelative, schemaSha256: schemaHash } : {})
};
const manifestPath = `${target}.manifest.json`;
if (!replace && (fs.existsSync(target) || fs.existsSync(manifestPath))) fail('Output or manifest exists; pass --replace to overwrite.');
fs.mkdirSync(path.dirname(target), { recursive: true });
const tempData = `${target}.tmp-${process.pid}`;
const tempManifest = `${manifestPath}.tmp-${process.pid}`;
try {
  fs.writeFileSync(tempData, contents, { flag: 'wx' });
  fs.writeFileSync(tempManifest, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  if (replace) {
    if (fs.existsSync(target)) fs.unlinkSync(target);
    if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);
  }
  fs.renameSync(tempData, target);
  fs.renameSync(tempManifest, manifestPath);
} catch (error) {
  for (const file of [tempData, tempManifest]) { try { fs.unlinkSync(file); } catch {} }
  fail(`Generation failed: ${error.message}`);
}
console.log(JSON.stringify({ ok: true, profile, count: records.length, seed: seedText, data: manifest.output, manifest: path.relative(process.cwd(), manifestPath).replace(/\\/g, '/') }));
