#!/usr/bin/env node
// Bounded, project-scoped text file helper. Run from the QEAgent project root.
const fs = require('node:fs');
const path = require('node:path');

const [action, project, area, ...args] = process.argv.slice(2);
const MAX_READ = 12 * 1024;
const MAX_WRITE = 2 * 1024 * 1024;
const MAX_RANGE_LINES = 200;
const MAX_SEARCH_RESULTS = 50;

function fail(message) { console.error(`qe-files: ${message}`); process.exit(2); }
function validProject(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value) && value !== '.' && value !== '..';
}
function projectBase() {
  if (!validProject(project)) fail('Use a project slug containing letters, numbers, underscore, or hyphen.');
  if (!['docs', 'output'].includes(area)) fail('Area must be docs or output.');
  return path.resolve(process.cwd(), area, project);
}
function resolveSafe(base, relative, allowBase = false) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative)) fail('Provide a project-relative path.');
  const target = path.resolve(base, relative);
  if ((!allowBase && target === base) || !target.startsWith(base + path.sep)) fail('Path escapes the selected project.');
  let current = path.resolve(process.cwd());
  for (const part of path.relative(process.cwd(), target).split(path.sep)) {
    if (!part || part === '.') continue;
    current = path.join(current, part);
    try { if (fs.lstatSync(current).isSymbolicLink()) fail('Symbolic links are not allowed in helper paths.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return target;
}
function ensureTextFile(file, maxBytes = MAX_READ) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) fail(`File not found: ${path.relative(process.cwd(), file)}`);
  const size = fs.statSync(file).size;
  if (size > maxBytes) fail(`File is ${size} bytes; this operation is limited to ${maxBytes} bytes.`);
  const data = fs.readFileSync(file);
  if (data.includes(0)) fail('Binary files cannot be read as text. Use a domain-specific tool for this artifact.');
  return data;
}

if (!['list', 'read', 'read-lines', 'search', 'write'].includes(action)) fail('Usage: qe-files.js list|read|read-lines|search|write <project> <docs|output> <relative-path> [options]. write reads content from stdin; pass --replace to overwrite.');
const base = projectBase();
let scanPath = path.resolve(process.cwd());
for (const part of path.relative(process.cwd(), base).split(path.sep)) {
  if (!part || part === '.') continue;
  scanPath = path.join(scanPath, part);
  try { if (fs.lstatSync(scanPath).isSymbolicLink()) fail('Symbolic links are not allowed in helper paths.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
if (!fs.existsSync(base) || !fs.statSync(base).isDirectory()) fail(`Project area does not exist: ${area}/${project}`);

if (action === 'list') {
  const rel = args[0] || '.';
  const dir = rel === '.' ? base : resolveSafe(base, rel, true);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) fail('Directory not found.');
  const entries = fs.readdirSync(dir, { withFileTypes: true }).slice(0, 100).map((entry) => ({
    name: entry.name,
    type: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other'
  }));
  console.log(JSON.stringify({ project, area, path: rel, entries, truncated: fs.readdirSync(dir).length > 100 }));
} else if (action === 'read') {
  const rel = args[0];
  const file = resolveSafe(base, rel);
  const bytes = ensureTextFile(file);
  console.log(JSON.stringify({ project, area, path: rel, bytes: bytes.length, content: bytes.toString('utf8') }));
} else if (action === 'read-lines') {
  const rel = args[0];
  const start = Number(args[1]);
  const count = Number(args[2]);
  if (!Number.isInteger(start) || start < 1 || !Number.isInteger(count) || count < 1 || count > MAX_RANGE_LINES) fail(`Use a 1-based start line and a count from 1 to ${MAX_RANGE_LINES}.`);
  const file = resolveSafe(base, rel);
  const data = ensureTextFile(file, 5 * 1024 * 1024).toString('utf8');
  const lines = data.split(/\r?\n/).slice(start - 1, start - 1 + count).map((text, index) => ({ line: start + index, text }));
  const bytes = Buffer.byteLength(JSON.stringify(lines), 'utf8');
  if (bytes > MAX_READ) fail(`Selected lines need ${bytes} bytes; narrow the range so the result stays under ${MAX_READ} bytes.`);
  console.log(JSON.stringify({ project, area, path: rel, startLine: start, lines }));
} else if (action === 'search') {
  const rel = args[0];
  const term = args[1];
  const maxResults = args[2] === undefined ? 20 : Number(args[2]);
  if (!term || term.length > 200) fail('Provide a search term of 1..200 characters.');
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > MAX_SEARCH_RESULTS) fail(`maxResults must be 1..${MAX_SEARCH_RESULTS}.`);
  const file = resolveSafe(base, rel);
  const lines = ensureTextFile(file, 5 * 1024 * 1024).toString('utf8').split(/\r?\n/);
  const matches = [];
  for (let index = 0; index < lines.length && matches.length < maxResults; index++) {
    if (lines[index].toLocaleLowerCase().includes(term.toLocaleLowerCase())) matches.push({ line: index + 1, text: lines[index].slice(0, 300) });
  }
  console.log(JSON.stringify({ project, area, path: rel, term, matches, truncated: matches.length === maxResults }));
} else {
  const rel = args[0];
  const replace = args.includes('--replace');
  if (path.basename(rel || '').toLowerCase() === 'qe-state.json') fail('Use qe-state.js for project state updates.');
  const file = resolveSafe(base, rel);
  const chunks = [];
  let length = 0;
  process.stdin.on('data', (chunk) => {
    length += chunk.length;
    if (length > MAX_WRITE) fail(`Input exceeds ${MAX_WRITE} bytes.`);
    chunks.push(chunk);
  });
  process.stdin.on('end', () => {
    if (fs.existsSync(file) && !replace) fail('Target exists; pass --replace to overwrite it.');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.tmp-${process.pid}`;
    try {
      fs.writeFileSync(temp, Buffer.concat(chunks), { flag: 'wx' });
      fs.renameSync(temp, file);
      console.log(JSON.stringify({ ok: true, project, area, path: rel, bytes: length, replaced: replace }));
    } catch (error) {
      try { fs.unlinkSync(temp); } catch {}
      fail(`Write failed: ${error.message}`);
    }
  });
}
