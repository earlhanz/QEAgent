// Minimal SessionStart context. Project-specific context is loaded explicitly
// with /qe:start <project> or /qe:continue <project> to avoid scanning projects.
process.stdin.setEncoding('utf8');
let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let event = {};
  try { event = JSON.parse(input); } catch { /* Keep the reminder generic. */ }
  const source = event.source || 'startup';
  const context = [
    'QEAgent is ready. First use:',
    '1. For a new project, run /qe:create <project-name> and add its design, user stories, and requirements under docs/<project-name>/.',
    '2. Start or select a project with /qe:start <project-name>. Then run /analysis:start <project-name> to create the QE strategy and scenarios.',
    '3. Review each phase and approve it explicitly before moving on. Use /qe:checkpoint <project-name> before stepping away.',
    '4. Resume later or reload context after compression with /qe:continue <project-name>.',
    'Commands load only the selected project state and task-relevant files; they do not scan other project folders.',
    `Session event: ${source}.`
  ].join('\n');
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context },
    systemMessage: 'Choose a project with /qe:start <project>. For a new project, use /qe:create <project>. Start gated analysis with /analysis:start <project>.'
  }));
});
