#!/usr/bin/env node
// Deterministic QE phase gate validator and approval recorder.
// Actions:
//   prepare <phase> <project>         fingerprint the reviewed version and set awaiting_human_approval
//   validate <phase> <project>        run approval checks without writing state
//   approve <phase> <project>         run approval checks and record approval
//   check-approved <phase> <project>  confirm the phase (and its upstream phases) are approved and unchanged
const fs = require('node:fs');
const path = require('node:path');
const { isProjectSlug, projectPath, phaseFingerprint, fileHash, gateFingerprint } = require('./helpers/qe-artifacts');

const [action, phase, project] = process.argv.slice(2);
const phases = ['analysis', 'manual_tests', 'automation'];
const upstreamOf = { analysis: [], manual_tests: ['analysis'], automation: ['analysis', 'manual_tests'] };
function fail(message) { console.error(`QE workflow gate: ${message}`); process.exit(2); }

if (!['prepare', 'validate', 'approve', 'check-approved'].includes(action)) fail('Use prepare|validate|approve|check-approved <analysis|manual_tests|automation> <project>.');
if (!phases.includes(phase)) fail(`Unknown phase '${phase}'.`);
if (!isProjectSlug(project)) fail('Provide a simple project slug (letters, numbers, underscore, hyphen; max 64).');

const root = path.resolve(process.cwd());
let statePath;
try { statePath = projectPath(root, project, `docs/${project}/qe-state.json`); }
catch (error) { fail(error.message); }
if (!fs.existsSync(statePath)) fail(`Missing project state: docs/${project}/qe-state.json`);
let state;
try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); }
catch { fail('Project state is invalid JSON; refusing to change it.'); }
if (state.project_id && state.project_id !== project) fail('project_id does not match the requested project.');

const gate = state.phase_gate?.[phase];
if (!gate || typeof gate !== 'object') fail(`Missing phase_gate.${phase} in project state.`);
const reasons = [];
const tracePath = () => state.artifacts?.traceability?.path || `docs/${project}/traceability-matrix.xlsx`;

function exists(relativePath) {
  try { return fs.existsSync(projectPath(root, project, relativePath)); }
  catch (error) { reasons.push(`unsafe artifact path '${relativePath}': ${error.message}`); return false; }
}
function hasFiles(relativePath) {
  try {
    const absolute = projectPath(root, project, relativePath);
    if (!fs.existsSync(absolute)) return false;
    if (fs.statSync(absolute).isFile()) return true;
    return fs.readdirSync(absolute).length > 0;
  } catch (error) { reasons.push(`cannot inspect '${relativePath}': ${error.message}`); return false; }
}
// True when the folder (recursively) contains at least one regular file; empty subfolders do not count.
function hasAnyFile(relativePath) {
  try {
    const stack = [projectPath(root, project, relativePath)];
    let visited = 0;
    while (stack.length && visited < 5000) {
      const current = stack.pop();
      if (!fs.existsSync(current)) continue;
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        visited++;
        if (entry.isSymbolicLink()) throw new Error('Symbolic links are not allowed in project artifact paths.');
        if (entry.isFile()) return true;
        if (entry.isDirectory()) stack.push(path.join(current, entry.name));
      }
    }
    return false;
  } catch (error) { reasons.push(`cannot inspect '${relativePath}': ${error.message}`); return false; }
}
function currentPhaseFingerprint(targetPhase) {
  try { return phaseFingerprint(root, project, state, targetPhase); }
  catch (error) { reasons.push(error.message); return null; }
}
function currentGateFingerprint(targetPhase) {
  const evidence = state.phase_gate?.[targetPhase]?.review_evidence || null;
  try { return gateFingerprint(root, project, state, targetPhase, evidence); }
  catch (error) { reasons.push(error.message); return null; }
}
// An approved phase stays current while its own phase artifacts match the fingerprint
// captured at approval time. The traceability workbook is deliberately excluded here so
// that later-phase workbook rows do not revoke an earlier approval.
function requireApprovedCurrent(targetPhase) {
  const target = state.phase_gate?.[targetPhase];
  if (target?.status !== 'approved') { reasons.push(`${targetPhase} gate is not approved (status '${target?.status}')`); return; }
  const expected = target.approval?.phase_fingerprint;
  if (!expected) { reasons.push(`${targetPhase} approval has no recorded phase_fingerprint; reopen, review, and approve that phase again`); return; }
  const actual = currentPhaseFingerprint(targetPhase);
  if (!actual || actual !== expected) reasons.push(`${targetPhase} artifacts changed after approval; reopen with /${commandName(targetPhase)}:feedback, review, and approve again`);
}
function commandName(targetPhase) {
  return targetPhase === 'manual_tests' ? 'manual' : targetPhase;
}
function requireSavedReview(label) {
  if (gate.reviewer_status !== 'ready') reasons.push(`${label} reviewer_status is '${gate.reviewer_status}', expected 'ready'`);
  if (!gate.review_evidence || !exists(gate.review_evidence)) { reasons.push(`saved ${label} reviewer report is missing`); return; }
  if (!gate.review_evidence_sha256) { reasons.push(`${label} reviewer report hash is not recorded; rerun the reviewer helper`); return; }
  try {
    if (fileHash(root, project, gate.review_evidence) !== gate.review_evidence_sha256) reasons.push(`${label} reviewer report changed after the reviewer recorded it; rerun the review`);
  } catch (error) { reasons.push(error.message); }
}

if (action === 'check-approved') {
  for (const upstream of upstreamOf[phase]) requireApprovedCurrent(upstream);
  requireApprovedCurrent(phase);
  if (reasons.length) fail(reasons.map((reason) => `- ${reason}`).join('\n'));
  console.log(JSON.stringify({ ok: true, action, phase, project, status: 'approved', approved_at: gate.approval?.date || null }));
  process.exit(0);
}

if (action !== 'prepare') {
  if (gate.status !== 'awaiting_human_approval') reasons.push(`phase status is '${gate.status}', expected 'awaiting_human_approval'`);
  if (!gate.artifact_version || typeof gate.artifact_version !== 'string') reasons.push('current artifact_version is missing');
}
for (const upstream of upstreamOf[phase]) requireApprovedCurrent(upstream);

if (phase === 'analysis') {
  const strategy = state.artifacts?.qe_strategy?.path || `docs/${project}/strategy/QE-strategy.md`;
  const scenarios = state.artifacts?.test_scenarios?.path || `docs/${project}/strategy/test-scenarios.json`;
  if (!exists(strategy)) reasons.push(`strategy artifact missing: ${strategy}`);
  if (!exists(scenarios)) reasons.push(`design-derived scenario register missing: ${scenarios}`);
  if (!hasAnyFile(`docs/${project}/design/`)) reasons.push(`no design source found under docs/${project}/design/; expected behavior must come from design`);
  if (!exists(tracePath())) reasons.push(`traceability workbook missing: ${tracePath()}`);
} else if (phase === 'manual_tests') {
  const tests = state.artifacts?.manual_tests?.path || `output/${project}/manualtests/`;
  if (!hasFiles(tests)) reasons.push(`manual test artifacts missing: ${tests}`);
  if (!exists(tracePath())) reasons.push('traceability workbook missing');
  requireSavedReview('manual-test');
} else {
  const automation = state.artifacts?.automation?.path || `output/${project}/automated tests/`;
  if (!hasFiles(automation)) reasons.push(`automation artifacts missing: ${automation}`);
  if (!exists(tracePath())) reasons.push('traceability workbook missing');
  const service = state.artifacts?.automation_service;
  if (!service || !['completed', 'not_applicable'].includes(service.status)) {
    reasons.push(`service virtualization decision is not recorded (artifacts.automation_service.status is '${service?.status}'); record completed or not_applicable`);
  } else if (service.status === 'completed' && !hasFiles(service.path || `output/${project}/automationservice/`)) {
    reasons.push('automation_service is marked completed but its artifact folder is empty or missing');
  }
  requireSavedReview('automation');
}

if (action === 'prepare') {
  if (gate.status === 'approved') reasons.push('phase is already approved; reopen it with feedback before preparing a new version');
  if (phase !== 'analysis') {
    const actualReviewed = currentPhaseFingerprint(phase);
    if (!gate.reviewed_artifact_version || !actualReviewed || actualReviewed !== gate.reviewed_artifact_version) reasons.push('review evidence does not match the current phase artifacts; rerun the reviewer before preparing approval');
  }
  if (reasons.length) fail(reasons.map((reason) => `- ${reason}`).join('\n'));
  gate.reviewed_artifact_version = currentPhaseFingerprint(phase);
  gate.artifact_version = currentGateFingerprint(phase);
  if (!gate.reviewed_artifact_version || !gate.artifact_version) fail(reasons.join('; ') || 'Could not fingerprint the current review artifacts.');
  gate.status = 'awaiting_human_approval';
  gate.approval = null;
  state.last_updated = new Date().toISOString().slice(0, 10);
  state.updated_by_skill = 'qe-workflow-validator';
  writeState(statePath, state);
  console.log(JSON.stringify({ ok: true, action, phase, project, artifact_version: gate.artifact_version, status: gate.status, current_phase: state.current_phase }));
  process.exit(0);
}

if (gate.artifact_version) {
  const actual = currentGateFingerprint(phase);
  if (!actual || actual !== gate.artifact_version) reasons.push('review artifacts (phase files, traceability workbook, or reviewer report) changed since they were prepared; rerun review and prepare the current version');
}
if (reasons.length) fail(reasons.map((reason) => `- ${reason}`).join('\n'));

if (action === 'approve') {
  const now = new Date().toISOString();
  gate.status = 'approved';
  gate.approval = {
    command: `/${commandName(phase)}:approve`,
    date: now,
    artifact_version: gate.artifact_version,
    phase_fingerprint: gate.reviewed_artifact_version
  };
  if (phase === 'analysis') state.current_phase = 'manual_tests';
  else if (phase === 'manual_tests') state.current_phase = 'automation';
  else state.current_phase = 'completed';
  state.last_updated = now.slice(0, 10);
  state.updated_by_skill = 'qe-workflow-validator';
  writeState(statePath, state);
}

console.log(JSON.stringify({ ok: true, action, phase, project, artifact_version: gate.artifact_version, status: action === 'approve' ? 'approved' : gate.status, current_phase: state.current_phase }));

function writeState(file, value) {
  const temporary = `${file}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
    fs.renameSync(temporary, file);
    const verified = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (verified.updated_by_skill !== value.updated_by_skill) throw new Error('state verification mismatch');
  } catch (error) {
    try { fs.unlinkSync(temporary); } catch {}
    fail(`State update failed: ${error.message}`);
  }
}
