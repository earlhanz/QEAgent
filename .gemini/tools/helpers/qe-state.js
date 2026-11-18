#!/usr/bin/env node
// Guarded project state summary, artifact status, reviewer status, and checkpoint updates.
const fs = require('node:fs');
const path = require('node:path');
const { isProjectSlug, projectPath, phaseFingerprint, fileHash } = require('./qe-artifacts');

const [action, project, ...args] = process.argv.slice(2);
const artifactStatuses = ['not_started', 'in_progress', 'blocked', 'completed', 'not_applicable'];
const phases = ['analysis', 'manual_tests', 'automation'];
const downstreamOf = { analysis: ['manual_tests', 'automation'], manual_tests: ['automation'], automation: [] };
const artifacts = ['qe_strategy', 'test_scenarios', 'manual_tests', 'test_data', 'automation', 'automation_service', 'execution', 'traceability'];

function fail(message) { console.error(`qe-state: ${message}`); process.exit(2); }
function rejectSymlinks(targetPath) {
  let current = path.resolve(process.cwd());
  for (const part of path.relative(process.cwd(), targetPath).split(path.sep)) {
    if (!part || part === '.') continue;
    current = path.join(current, part);
    try { if (fs.lstatSync(current).isSymbolicLink()) fail('Symbolic links are not allowed in helper paths.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
if (!isProjectSlug(project)) fail('Provide a valid project slug (letters, numbers, underscore, hyphen; max 64).');
const root = process.cwd();
const docs = path.resolve(root, 'docs');
const projectRoot = path.resolve(docs, project);
if (!projectRoot.startsWith(docs + path.sep)) fail('Project path escapes docs/.');
const statePath = path.join(projectRoot, 'qe-state.json');
rejectSymlinks(statePath);
if (!fs.existsSync(statePath)) fail(`Missing docs/${project}/qe-state.json.`);
let state;
try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); }
catch { fail('State file is invalid JSON; refusing to overwrite it.'); }
if (state.project_id && state.project_id !== project) fail('project_id does not match the requested project.');

function save(actor) {
  state.last_updated = new Date().toISOString().slice(0, 10);
  state.updated_by_skill = actor;
  const temp = `${statePath}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, { flag: 'wx' });
    fs.renameSync(temp, statePath);
    const verified = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    if (verified.updated_by_skill !== actor) fail('State write verification failed.');
  } catch (error) {
    try { fs.unlinkSync(temp); } catch {}
    fail(`State write failed: ${error.message}`);
  }
}
if (action === 'summary') {
  const result = {
    project_id: state.project_id,
    project_status: state.project_status,
    current_phase: state.current_phase,
    phase_gate: Object.fromEntries(phases.map((phase) => [phase, {
      status: state.phase_gate?.[phase]?.status,
      reviewer_status: state.phase_gate?.[phase]?.reviewer_status,
      artifact_version: state.phase_gate?.[phase]?.artifact_version,
      review_evidence: state.phase_gate?.[phase]?.review_evidence
    }])),
    artifacts: Object.fromEntries(artifacts.map((key) => [key, {
      status: state.artifacts?.[key]?.status,
      path: state.artifacts?.[key]?.path
    }])),
    open_questions: (state.open_questions || []).slice(0, 10),
    risks_and_blockers: (state.risks_and_blockers || []).slice(0, 10),
    checkpoint: state.checkpoint || null
  };
  console.log(JSON.stringify(result));
} else if (action === 'artifact') {
  const [key, status, actor, artifactPath] = args;
  if (!artifacts.includes(key)) fail(`Unknown artifact key. Use: ${artifacts.join(', ')}.`);
  if (!artifactStatuses.includes(status)) fail(`Unknown artifact status. Use: ${artifactStatuses.join(', ')}.`);
  if (!actor || !/^[a-z0-9_-]{2,64}$/i.test(actor)) fail('Provide the updating skill name.');
  if (!state.artifacts || typeof state.artifacts !== 'object' || !state.artifacts[key]) fail(`Missing artifacts.${key} in state schema.`);
  const current = state.artifacts[key];
  const nextPath = artifactPath || current.path;
  if (artifactPath) {
    try { projectPath(root, project, artifactPath); }
    catch (error) { fail(error.message); }
  }
  if (status === 'completed') {
    if (typeof nextPath !== 'string' || !nextPath) fail('Completed artifacts require a project-relative artifact path.');
    let absolute;
    try { absolute = projectPath(root, project, nextPath); }
    catch (error) { fail(error.message); }
    if (!fs.existsSync(absolute)) fail('Completed artifact path must exist inside the selected project docs/ or output/ folder.');
  }
  state.artifacts[key] = { ...current, status, path: nextPath };
  save(actor);
  console.log(JSON.stringify({ ok: true, project, artifact: key, status, path: nextPath }));
} else if (action === 'reviewer') {
  const [phase, status, actor, evidencePath] = args;
  if (!phases.includes(phase)) fail(`Phase must be one of: ${phases.join(', ')}.`);
  if (!['not_reviewed', 'ready', 'needs_changes'].includes(status)) fail('Reviewer status must be not_reviewed, ready, or needs_changes.');
  if (!actor || !/^[a-z0-9_-]{2,64}$/i.test(actor)) fail('Provide the reviewing skill name.');
  const gate = state.phase_gate?.[phase];
  if (!gate) fail(`Missing phase_gate.${phase}.`);
  if (gate.status === 'approved') fail(`Phase ${phase} is approved. Reopen it first (feedback command or qe-state.js invalidate) before recording a new review.`);
  if (!evidencePath || !/^docs\/[A-Za-z0-9_-]+\/reviews\/[A-Za-z0-9][A-Za-z0-9._-]{0,119}\.md$/.test(evidencePath) || !evidencePath.startsWith(`docs/${project}/reviews/`)) fail('Provide a saved reviewer report under docs/<project>/reviews/<name>.md.');
  let resolvedEvidence;
  let reviewedVersion;
  let evidenceHash;
  try {
    resolvedEvidence = projectPath(root, project, evidencePath);
    if (!fs.existsSync(resolvedEvidence) || !fs.statSync(resolvedEvidence).isFile()) fail('Reviewer report does not exist.');
    if (fs.statSync(resolvedEvidence).size === 0) fail('Reviewer report is empty.');
    evidenceHash = fileHash(root, project, evidencePath);
    reviewedVersion = phaseFingerprint(root, project, state, phase);
  } catch (error) { fail(error.message); }
  gate.reviewer_status = status;
  gate.review_evidence = evidencePath;
  gate.review_evidence_sha256 = evidenceHash;
  gate.reviewed_artifact_version = reviewedVersion;
  // A new review supersedes any previously prepared version; prepare must run again.
  gate.approval = null;
  gate.artifact_version = null;
  gate.status = status === 'needs_changes' ? 'changes_requested' : 'in_progress';
  save(actor);
  console.log(JSON.stringify({ ok: true, project, phase, reviewer_status: status, phase_status: gate.status, reviewed_artifact_version: reviewedVersion, review_evidence: evidencePath }));
} else if (action === 'reopen' || action === 'invalidate') {
  const [phase, actor] = args;
  if (!phases.includes(phase)) fail(`Phase must be one of: ${phases.join(', ')}.`);
  if (!actor || !/^[a-z0-9_-]{2,64}$/i.test(actor)) fail('Provide the skill or command name.');
  const gate = state.phase_gate?.[phase];
  if (!gate) fail(`Missing phase_gate.${phase}.`);
  const resetGate = (target, status) => {
    target.status = status;
    target.approval = null;
    target.artifact_version = null;
    target.reviewed_artifact_version = null;
    target.review_evidence = null;
    target.review_evidence_sha256 = null;
    target.reviewer_status = 'not_reviewed';
  };
  resetGate(gate, 'changes_requested');
  const entry = { date: new Date().toISOString().slice(0, 10), action, by: actor };
  gate.feedback = [...(Array.isArray(gate.feedback) ? gate.feedback : []), entry].slice(-10);
  // Downstream work was derived from the reopened phase, so its approval or pending review is stale.
  const downstreamInvalidated = [];
  for (const later of downstreamOf[phase]) {
    const target = state.phase_gate?.[later];
    if (!target) continue;
    if (['approved', 'awaiting_human_approval', 'in_progress'].includes(target.status) || (target.reviewer_status && target.reviewer_status !== 'not_reviewed')) {
      resetGate(target, 'changes_requested');
      target.feedback = [...(Array.isArray(target.feedback) ? target.feedback : []), { ...entry, action: `upstream_${phase}_${action}` }].slice(-10);
      downstreamInvalidated.push(later);
    }
  }
  state.current_phase = phase;
  save(actor);
  console.log(JSON.stringify({ ok: true, project, phase, status: gate.status, invalidated: true, downstream_invalidated: downstreamInvalidated }));
} else if (action === 'execution') {
  const [summaryPath, actor] = args;
  if (!summaryPath || path.isAbsolute(summaryPath) || !summaryPath.startsWith(`output/${project}/.qe/runs/`) || !/^output\/[A-Za-z0-9_-]+\/\.qe\/runs\/[A-Za-z0-9_-]{1,80}\/run-summary\.json$/.test(summaryPath)) fail('Provide output/<project>/.qe/runs/<run-id>/run-summary.json (run-id: letters, numbers, underscore, hyphen).');
  if (!actor || !/^[a-z0-9_-]{2,64}$/i.test(actor)) fail('Provide the updating skill name.');
  const absolute = path.resolve(root, summaryPath);
  const outputRoot = path.resolve(root, 'output', project) + path.sep;
  rejectSymlinks(absolute);
  if (!absolute.startsWith(outputRoot) || !fs.existsSync(absolute)) fail('Execution summary must exist inside the selected project output folder.');
  if (fs.statSync(absolute).size > 256 * 1024) fail('Execution summary exceeds 256 KiB; keep raw output in runner.log.');
  let summary;
  try { summary = JSON.parse(fs.readFileSync(absolute, 'utf8')); } catch { fail('Execution summary is invalid JSON.'); }
  const problems = validateRunSummary(summary, summaryPath);
  if (problems.length) fail(`Execution summary is invalid:\n- ${problems.join('\n- ')}`);
  const status = summary.status === 'blocked' ? 'blocked' : 'completed';
  const failures = summary.failures || [];
  state.artifacts.execution = {
    ...(state.artifacts.execution || {}), status, path: summaryPath,
    last_run_at: summary.finishedAt,
    summary: {
      run_id: summary.runId,
      status: summary.status,
      initial_counts: summary.counts,
      retest_count: (summary.retests || []).length,
      healed_tests: (summary.healedTests || []).map((item) => item.test).slice(0, 20),
      application_failures: failures.filter((item) => item.class === 'application').length,
      unresolved_failures: failures.filter((item) => item.healingStatus !== 'healed_passed').length
    }
  };
  save(actor);
  console.log(JSON.stringify({ ok: true, project, run_id: summary.runId, run_status: summary.status, state_status: status, path: summaryPath }));
} else if (action === 'checkpoint') {
  const actor = args[0];
  if (!actor || !/^[a-z0-9_-]{2,64}$/i.test(actor)) fail('Usage: qe-state.js checkpoint <project> <skill-or-command> (JSON from stdin).');
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    input += chunk;
    if (Buffer.byteLength(input, 'utf8') > 16 * 1024) fail('Input exceeds 16 KB.');
  });
  process.stdin.on('end', () => {
    let checkpoint;
    try { checkpoint = JSON.parse(input); } catch { fail('stdin must contain valid checkpoint JSON.'); }
    const active = checkpoint.work_in_progress;
    const next = checkpoint.next_actions;
    if (!Array.isArray(active) || !Array.isArray(next) || active.length > 5 || next.length > 5) fail('Checkpoint requires work_in_progress and next_actions arrays with no more than 5 entries each.');
    if (!checkpoint || typeof checkpoint !== 'object' || Array.isArray(checkpoint)) fail('Checkpoint must be a JSON object.');
    const extraTop = Object.keys(checkpoint).filter((key) => !['work_in_progress', 'next_actions'].includes(key));
    if (extraTop.length) fail(`Unsupported checkpoint fields: ${extraTop.join(', ')}. Only work_in_progress and next_actions are accepted.`);
    const allowedItemKeys = ['task_id', 'task', 'status', 'artifact_path'];
    const safeArtifactPath = (value) => {
      if (value === undefined || value === null || value === '') return true;
      if (typeof value !== 'string' || value.length > 200) return false;
      try { projectPath(root, project, value); return true; } catch { return false; }
    };
    const validItems = (items, statuses) => items.every((item) => item && typeof item === 'object' && !Array.isArray(item)
      && Object.keys(item).every((key) => allowedItemKeys.includes(key))
      && /^[A-Za-z0-9_-]{1,48}$/.test(item.task_id || '') && typeof item.task === 'string' && item.task.trim().length > 0 && item.task.length <= 240
      && statuses.includes(item.status) && safeArtifactPath(item.artifact_path));
    if (!validItems(active, ['in_progress', 'blocked']) || !validItems(next, ['pending', 'blocked'])) fail('Checkpoint items accept only task_id, task (<=240 chars), status (in_progress|blocked for active; pending|blocked for next), and an optional artifact_path inside this project docs/ or output/ folder. Completed items must be removed.');
    const ids = [...active, ...next].map((item) => item.task_id);
    if (new Set(ids).size !== ids.length) fail('Checkpoint task_id values must be unique.');
    const pick = (item) => Object.fromEntries(allowedItemKeys.filter((key) => item[key] !== undefined && item[key] !== null && item[key] !== '').map((key) => [key, key === 'task' ? item[key].trim() : item[key]]));
    const clean = {
      saved_at: new Date().toISOString(), saved_by: actor,
      work_in_progress: active.map(pick), next_actions: next.map(pick)
    };
    if (Buffer.byteLength(JSON.stringify(clean), 'utf8') > 2000) fail('Checkpoint exceeds the 2,000-byte limit. Shorten task descriptions.');
    state.checkpoint = clean;
    save(actor);
    console.log(JSON.stringify({ ok: true, project, saved_by: actor, active: active.length, next: next.length }));
  });
} else {
  fail('Usage: qe-state.js summary|artifact|reviewer|reopen|invalidate|execution|checkpoint <project> ...');
}

function validateRunSummary(summary, summaryPath) {
  const problems = [];
  const isCount = (value) => Number.isInteger(value) && value >= 0;
  const checkCounts = (counts, label) => {
    if (!counts || typeof counts !== 'object') { problems.push(`${label} object is required`); return; }
    if (!isCount(counts.total)) problems.push(`${label}.total must be a non-negative integer`);
    for (const key of ['passed', 'failed', 'skipped', 'timedOut', 'flaky']) {
      if (counts[key] !== undefined && counts[key] !== null && !isCount(counts[key])) problems.push(`${label}.${key} must be a non-negative integer when present`);
    }
    const parts = ['passed', 'failed', 'skipped', 'timedOut'].reduce((sum, key) => sum + (isCount(counts[key]) ? counts[key] : 0), 0);
    if (isCount(counts.total) && parts > counts.total) problems.push(`${label} passed+failed+skipped+timedOut exceeds total`);
  };
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return ['summary must be a JSON object'];
  const runId = summaryPath.split('/').slice(-2, -1)[0];
  if (typeof summary.runId !== 'string' || summary.runId !== runId) problems.push(`runId must match the run folder name '${runId}'`);
  if (summary.project !== undefined && summary.project !== project) problems.push('project does not match the selected project');
  if (typeof summary.finishedAt !== 'string' || !Number.isFinite(Date.parse(summary.finishedAt))) problems.push('finishedAt must be an ISO timestamp');
  if (!['passed', 'failed', 'partially_passed', 'blocked'].includes(summary.status)) problems.push('status must be passed, failed, partially_passed, or blocked');
  checkCounts(summary.counts, 'counts');
  const failures = summary.failures === undefined ? [] : summary.failures;
  if (!Array.isArray(failures)) problems.push('failures must be an array');
  else for (const [index, item] of failures.entries()) {
    if (!item || typeof item.test !== 'string' || !item.test) problems.push(`failures[${index}].test is required`);
    if (!['script', 'application', 'environment', 'unknown'].includes(item?.class)) problems.push(`failures[${index}].class must be script, application, environment, or unknown`);
    if (item?.class === 'application' && item.healingStatus === 'healed_passed') problems.push(`failures[${index}] is an application bug and cannot be marked healed_passed`);
    if (item?.healingStatus !== undefined && !['not_applicable', 'pending', 'healed_passed', 'still_failing', 'application_bug_stop', 'blocked'].includes(item.healingStatus)) problems.push(`failures[${index}].healingStatus is not an allowed value`);
  }
  const retests = summary.retests === undefined ? [] : summary.retests;
  if (!Array.isArray(retests)) problems.push('retests must be an array');
  else {
    const attemptsPerSpec = {};
    for (const [index, item] of retests.entries()) {
      if (!item || typeof item.spec !== 'string' || !item.spec) problems.push(`retests[${index}].spec is required`);
      if (!Number.isInteger(item?.attempt) || item.attempt < 1 || item.attempt > 2) problems.push(`retests[${index}].attempt must be 1 or 2 (two heal/retest cycles maximum)`);
      if (typeof item?.command !== 'string' || !item.command) problems.push(`retests[${index}].command is required`);
      checkCounts(item?.counts, `retests[${index}].counts`);
      const key = item?.spec;
      attemptsPerSpec[key] = (attemptsPerSpec[key] || 0) + 1;
      if (attemptsPerSpec[key] > 2) problems.push(`more than two retests recorded for ${key}`);
    }
  }
  const healed = summary.healedTests === undefined ? [] : summary.healedTests;
  if (!Array.isArray(healed)) problems.push('healedTests must be an array');
  else for (const [index, item] of healed.entries()) {
    if (!item || typeof item.test !== 'string' || !item.test) problems.push(`healedTests[${index}].test is required`);
    if (!Array.isArray(item?.filesChanged) || !item.filesChanged.length) problems.push(`healedTests[${index}].filesChanged must list the changed files`);
    if (typeof item?.change !== 'string' || !item.change) problems.push(`healedTests[${index}].change must describe the exact change`);
    if (typeof item?.retestResult !== 'string' || !item.retestResult) problems.push(`healedTests[${index}].retestResult must record the observed post-heal result or 'not_run'`);
  }
  if (Array.isArray(healed) && Array.isArray(retests) && !retests.length && healed.some((item) => item && item.retestResult && item.retestResult !== 'not_run')) problems.push('healed tests report a retest result but no retests are recorded');
  return problems;
}
