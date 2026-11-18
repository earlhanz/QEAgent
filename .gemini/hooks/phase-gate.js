// Best-effort BeforeTool guard against bypassing QE phase gates through direct writes.
// Gemini CLI sends {tool_name, tool_input, cwd, ...} on stdin. Returning
// {"decision":"deny","reason":...} blocks the tool call; "{}" allows it.
// This guard is heuristic: it inspects the paths and commands Gemini tools receive and
// cannot see writes performed indirectly by scripts. qe-workflow.js remains the approval check.
const fs = require('node:fs');
const path = require('node:path');

const PHASE_REQUIREMENTS = {
  // output bucket -> phases that must be approved before writing there
  manualtests: ['analysis'],
  'testdata/manual': ['analysis'],
  'automated tests': ['analysis', 'manual_tests'],
  'testdata/automation': ['analysis', 'manual_tests'],
  automationservice: ['analysis', 'manual_tests']
};
const WRITE_TOOLS = /^(write_file|replace|run_shell_command)$/;
const SHELL_WRITE_PATTERN = /(>|\bSet-Content\b|\bAdd-Content\b|\bOut-File\b|\btee\b|\bsed\s+-i|\bmv\b|\bcp\b|\bMove-Item\b|\bCopy-Item\b|\bRemove-Item\b|\brm\b|\bdel\b|writeFile|WriteAllText)/i;

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  let deny = null;
  try {
    const input = JSON.parse(raw || '{}');
    const tool = String(input.tool_name || '');
    if (!WRITE_TOOLS.test(tool)) return allow();
    const payload = input.tool_input || {};
    const root = path.resolve(process.env.GEMINI_PROJECT_DIR || input.cwd || process.cwd());
    // Normalize Windows separators (including JSON-escaped backslashes) before matching.
    const text = JSON.stringify(payload).replace(/\\\\/g, '/').replace(/\\/g, '/');
    const command = String(payload.command || '').replace(/\\/g, '/');
    const stateMatch = text.match(/docs\/([A-Za-z0-9_-]+)\/qe-state\.json/i);

    if (stateMatch) {
      if (tool === 'write_file' || tool === 'replace') {
        deny = `Direct edits to docs/${stateMatch[1]}/qe-state.json are blocked. Use .gemini/tools/helpers/qe-state.js for state updates and .gemini/tools/qe-workflow.js for phase approval.`;
      } else if (!/qe-workflow\.js|qe-state\.js|qe-project\.js/.test(command) && (SHELL_WRITE_PATTERN.test(command) || /approved/i.test(command))) {
        deny = 'Shell writes to qe-state.json are blocked. Use qe-state.js for state updates; only qe-workflow.js may record approvals.';
      }
    }

    if (!deny) {
      const targets = [];
      const bucketPattern = /output\/([A-Za-z0-9_-]+)\/(manualtests|testdata\/manual|testdata\/automation|automated tests|automationservice)(?=[\/"'\s]|$)/gi;
      const shellWrites = tool !== 'run_shell_command' || SHELL_WRITE_PATTERN.test(command);
      if (shellWrites) for (const match of text.matchAll(bucketPattern)) targets.push([match[1], match[2].toLowerCase()]);
      // Helper forms that name the project and the project-relative path separately.
      const unquote = (value) => String(value || '').replace(/^['"]|['"]$/g, '');
      for (const match of command.matchAll(/qe-files\.js\s+write\s+(\S+)\s+output\s+("[^"]+"|'[^']+'|\S+)/g)) {
        const rel = unquote(match[2]).replace(/^\.\//, '').toLowerCase();
        const bucket = Object.keys(PHASE_REQUIREMENTS).find((key) => rel === key || rel.startsWith(`${key}/`));
        if (bucket) targets.push([unquote(match[1]), bucket]);
      }
      for (const match of command.matchAll(/qe-data\.js\s+generate\s+(\S+)\s+\S+\s+\S+\s+\S+\s+(manual|automation)\//g)) {
        targets.push([unquote(match[1]), `testdata/${match[2]}`]);
      }
      for (const [project, bucket] of targets) {
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(project)) { deny = 'Invalid project slug in a gated output write.'; break; }
        const state = readState(root, project);
        if (!state) { deny = `Cannot write ${bucket} for ${project}: docs/${project}/qe-state.json is missing or invalid; initialize or recover state first.`; break; }
        const missing = PHASE_REQUIREMENTS[bucket].filter((phase) => state.phase_gate?.[phase]?.status !== 'approved');
        if (missing.length) { deny = `Writing output/${project}/${bucket} is blocked: approval required for ${missing.join(' and ')}.`; break; }
      }
    }
  } catch {
    return allow();
  }
  if (deny) process.stdout.write(JSON.stringify({ decision: 'deny', reason: deny }));
  else allow();
});

function allow() { process.stdout.write('{}'); }
function readState(root, project) {
  try { return JSON.parse(fs.readFileSync(path.join(root, 'docs', project, 'qe-state.json'), 'utf8')); }
  catch { return null; }
}
