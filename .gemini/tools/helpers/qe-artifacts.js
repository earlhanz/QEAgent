// Shared safe path and phase artifact fingerprinting for QE state and gate tools.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const MAX_FILES = 5000;
const MAX_TOTAL_BYTES = 64 * 1024 * 1024;

function isProjectSlug(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

function projectPath(root, project, relativePath) {
  if (!isProjectSlug(project)) throw new Error('Invalid project slug.');
  const base = path.resolve(root);
  if (typeof relativePath !== 'string' || !relativePath || path.isAbsolute(relativePath)) throw new Error('Project artifact path must be relative.');
  const absolute = path.resolve(base, relativePath);
  if (!absolute.startsWith(base + path.sep)) throw new Error('Project artifact path escapes the workspace.');
  if (!absolute.startsWith(path.join(base, 'docs', project) + path.sep) && !absolute.startsWith(path.join(base, 'output', project) + path.sep)) {
    throw new Error('Artifact paths must stay inside this project docs/ or output/ folder.');
  }
  rejectSymlinks(base, absolute);
  return absolute;
}

function rejectSymlinks(root, target) {
  let current = root;
  for (const part of path.relative(root, target).split(path.sep)) {
    if (!part || part === '.') continue;
    current = path.join(current, part);
    try { if (fs.lstatSync(current).isSymbolicLink()) throw new Error('Symbolic links are not allowed in project artifact paths.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

function phasePaths(root, project, state, phase) {
  if (phase === 'analysis') return [
    state.artifacts?.qe_strategy?.path || `docs/${project}/strategy/QE-strategy.md`,
    `docs/${project}/strategy/test-scenarios.json`,
    `docs/${project}/design/`,
    `docs/${project}/user-story/`,
    `docs/${project}/requirements/`
  ];
  if (phase === 'manual_tests') return [
    state.artifacts?.manual_tests?.path || `output/${project}/manualtests/`,
    `output/${project}/testdata/manual/`
  ];
  if (phase === 'automation') return [
    state.artifacts?.automation?.path || `output/${project}/automated tests/`,
    `output/${project}/testdata/automation/`,
    `output/${project}/automationservice/`
  ];
  throw new Error(`Unknown phase '${phase}'.`);
}

function filesFor(root, project, relativePath) {
  const absolute = projectPath(root, project, relativePath);
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return [absolute];
  if (!stat.isDirectory()) return [];
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Symbolic links are not allowed in fingerprinted directories.');
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        files.push(full);
        if (files.length > MAX_FILES) throw new Error(`Fingerprint input exceeds ${MAX_FILES} files.`);
      }
    }
  }
  walk(absolute);
  return files.sort();
}

function phaseFingerprint(root, project, state, phase) {
  const hash = crypto.createHash('sha256');
  let totalBytes = 0;
  for (const rel of phasePaths(root, project, state, phase)) {
    let files;
    try { files = filesFor(root, project, rel); }
    catch (error) { throw new Error(`Cannot fingerprint '${rel}': ${error.message}`); }
    if (!files.length) { hash.update(`MISSING:${rel}\n`); continue; }
    for (const file of files) {
      const bytes = fs.readFileSync(file);
      totalBytes += bytes.length;
      if (totalBytes > MAX_TOTAL_BYTES) throw new Error(`Fingerprint input exceeds ${MAX_TOTAL_BYTES} bytes.`);
      hash.update(path.relative(root, file).replace(/\\/g, '/') + '\0');
      hash.update(bytes);
      hash.update('\0');
    }
  }
  return hash.digest('hex');
}

function fileHash(root, project, relativePath) {
  const absolute = projectPath(root, project, relativePath);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) throw new Error(`Evidence file does not exist: ${relativePath}`);
  const data = fs.readFileSync(absolute);
  if (data.length > MAX_TOTAL_BYTES) throw new Error('Evidence file is too large to fingerprint.');
  return crypto.createHash('sha256').update(data).digest('hex');
}

function gateFingerprint(root, project, state, phase, evidencePath = null) {
  const baseFingerprint = phaseFingerprint(root, project, state, phase);
  const tracePath = state.artifacts?.traceability?.path || `docs/${project}/traceability-matrix.xlsx`;
  const hash = crypto.createHash('sha256').update(baseFingerprint);
  hash.update('\0traceability\0');
  hash.update(tracePath.replace(/\\/g, '/') + '\0');
  hash.update(fileHash(root, project, tracePath));
  if (phase !== 'analysis') {
    if (!evidencePath) throw new Error(`${phase} gate requires saved reviewer evidence.`);
    hash.update('\0review-evidence\0');
    hash.update(evidencePath.replace(/\\/g, '/') + '\0');
    hash.update(fileHash(root, project, evidencePath));
  }
  return hash.digest('hex');
}

module.exports = { isProjectSlug, projectPath, phaseFingerprint, fileHash, gateFingerprint };
