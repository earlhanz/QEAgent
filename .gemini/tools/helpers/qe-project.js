#!/usr/bin/env node
// Create a new project skeleton, or add missing state to an existing project, without
// overwriting any existing file or folder content.
const fs = require('node:fs');
const path = require('node:path');

const [action, project] = process.argv.slice(2);
function fail(message) { console.error(`qe-project: ${message}`); process.exit(2); }
function rejectSymlinkPath(target) {
  let current = path.resolve(process.cwd());
  for (const part of path.relative(process.cwd(), target).split(path.sep)) {
    if (!part || part === '.') continue;
    current = path.join(current, part);
    try { if (fs.lstatSync(current).isSymbolicLink()) fail('Symbolic links are not allowed in project paths.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
if (!['create', 'init-state'].includes(action)) fail('Usage: qe-project.js create|init-state <project-slug>.');
if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(project || '')) fail('Use a valid project slug (letters, numbers, underscore, hyphen; max 64; starts with a letter or number).');
if (project === 'sampleprojectname') fail('sampleprojectname is the template project; choose a different project slug.');

const root = path.resolve(process.cwd());
const docsRoot = path.join(root, 'docs');
const outputRoot = path.join(root, 'output');
const docsProject = path.join(docsRoot, project);
const outputProject = path.join(outputRoot, project);
const templateDir = path.join(docsRoot, 'sampleprojectname');
rejectSymlinkPath(docsProject); rejectSymlinkPath(outputProject); rejectSymlinkPath(templateDir);
if (!fs.existsSync(docsRoot)) fail('Run this command from the QEAgent project root (docs/ is missing).');

function replaceSlug(value) {
  if (typeof value === 'string') return value.replaceAll('sampleprojectname', project);
  if (Array.isArray(value)) return value.map(replaceSlug);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceSlug(item)]));
  return value;
}
// Build a fresh state from the template, resetting every progress field.
function freshState() {
  let template;
  try { template = JSON.parse(fs.readFileSync(path.join(templateDir, 'qe-state.json'), 'utf8')); }
  catch { fail('Could not read the template state docs/sampleprojectname/qe-state.json.'); }
  const state = replaceSlug(template);
  state.project_id = project;
  state.project_status = 'not_started';
  state.current_phase = 'analysis';
  state.last_updated = null;
  state.updated_by_skill = null;
  state.checkpoint = { saved_at: null, saved_by: null, work_in_progress: [], next_actions: [] };
  for (const key of ['sources_reviewed', 'decisions', 'open_questions', 'risks_and_blockers', 'notes']) state[key] = [];
  for (const gate of Object.values(state.phase_gate || {})) {
    Object.assign(gate, { status: 'not_started', artifact_version: null, reviewer_status: 'not_reviewed', reviewed_artifact_version: null, review_evidence: null, review_evidence_sha256: null, approval: null, feedback: [] });
  }
  for (const artifact of Object.values(state.artifacts || {})) artifact.status = 'not_started';
  if (state.artifacts?.execution) Object.assign(state.artifacts.execution, { path: null, last_run_at: null, summary: null });
  if (state.strategy) Object.assign(state.strategy, { status: 'not_started', last_updated: null });
  return state;
}
// Copy the header-only traceability workbook template when the project has none.
function copyWorkbookIfMissing() {
  const target = path.join(docsProject, 'traceability-matrix.xlsx');
  const source = path.join(templateDir, 'traceability-matrix.xlsx');
  if (fs.existsSync(target)) return 'existing workbook preserved';
  if (!fs.existsSync(source)) return 'template workbook not found; QE-Architect must create one';
  fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
  return `copied from template; replace the placeholder 'sampleprojectname' row on first update`;
}

if (action === 'init-state') {
  if (!fs.existsSync(docsProject) || !fs.statSync(docsProject).isDirectory()) fail(`Missing docs/${project}/. Use create for a new project.`);
  const targetState = path.join(docsProject, 'qe-state.json');
  if (fs.existsSync(targetState)) fail('Project state already exists; nothing was changed.');
  const state = freshState();
  const created = [];
  try {
    for (const folder of ['design', 'design/api', 'user-story', 'requirements', 'strategy', 'reviews']) {
      const dir = path.join(docsProject, folder);
      if (!fs.existsSync(dir)) { fs.mkdirSync(dir); created.push(`docs/${project}/${folder}/`); }
    }
    fs.writeFileSync(targetState, `${JSON.stringify(state, null, 2)}\n`, { flag: 'wx' });
  } catch (error) { fail(`init-state stopped: ${error.message}. No existing files were overwritten.`); }
  const workbook = copyWorkbookIfMissing();
  console.log(JSON.stringify({ ok: true, project, state: `docs/${project}/qe-state.json`, created_folders: created, traceability: workbook, note: 'Existing project files were not modified. Output folders are created on demand.' }));
  process.exit(0);
}

// docs/ already proved this is the QEAgent root; a fresh git clone has no empty output/ folder.
rejectSymlinkPath(outputRoot);
if (!fs.existsSync(outputRoot)) fs.mkdirSync(outputRoot);
if (fs.existsSync(docsProject) || fs.existsSync(outputProject)) fail('A docs/ or output/ folder with this project name already exists. Nothing was changed; inspect existing folders and use init-state only if state alone is missing.');

const state = freshState();
const directories = [
  'design', 'design/api', 'user-story', 'requirements', 'strategy', 'reviews'
].map((item) => path.join(docsProject, item)).concat([
  'manualtests', 'testdata/manual', 'testdata/automation', 'automated tests', 'automationservice', '.qe/runs'
].map((item) => path.join(outputProject, item)));
let workbook;
try {
  fs.mkdirSync(docsProject, { recursive: false });
  fs.mkdirSync(outputProject, { recursive: false });
  for (const directory of directories) fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(docsProject, 'qe-state.json'), `${JSON.stringify(state, null, 2)}\n`, { flag: 'wx' });
  JSON.parse(fs.readFileSync(path.join(docsProject, 'qe-state.json'), 'utf8'));
  workbook = copyWorkbookIfMissing();
} catch (error) {
  fail(`Project initialization stopped after creating some folders: ${error.message}. No existing files were overwritten. Inspect docs/${project}/ and output/${project}/ before retrying.`);
}
console.log(JSON.stringify({ ok: true, project, docs: `docs/${project}/`, output: `output/${project}/`, state: `docs/${project}/qe-state.json`, traceability: workbook, next: `Add design documents to docs/${project}/design/, then run /qe:start ${project} and /analysis:start ${project}.` }));
