# Refine Idea: Add `dust bucket` command

Thoroughly research this idea and refine it into a well-defined proposal. Read the idea file, explore the codebase for relevant context, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Review `.dust/goals/` for alignment and `.dust/facts/` for relevant design decisions. See [Add `dust bucket` command](../ideas/add-dust-bucket-command.md).

Here's an example of the UI that I want (with simulated processes for each loop):

```
#!/usr/bin/env bun
// Multi-process log viewer demo — no dependencies, pure ANSI terminal UI

// ─── ANSI Helpers ───────────────────────────────────────────────────────────

const ESC = '\x1b[';
const write = (s: string) => process.stdout.write(s);
const enterAltScreen = () => write('\x1b[?1049h\x1b[?25l'); // alt screen + hide cursor
const leaveAltScreen = () => write('\x1b[?1049l\x1b[?25l');
const showCursor = () => write('\x1b[?25h');
const moveTo = (r: number, c: number) => write(`${ESC}${r};${c}H`);
const clearScreen = () => write(`${ESC}2J`);
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const inverse = (s: string) => `\x1b[7m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const blue = (s: string) => `\x1b[34m${s}\x1b[0m`;
const magenta = (s: string) => `\x1b[35m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;

const COLORS = [green, yellow, blue, magenta, cyan];

// ─── Types & State ──────────────────────────────────────────────────────────

type LogLine = { text: string; stream: 'stdout' | 'stderr'; timestamp: number };
type Proc = {
  id: string;
  name: string;
  color: (s: string) => string;
  logs: LogLine[];
  alive: boolean;
};

let processes: Proc[] = [];
let selected: string | null = null; // null = show all
let cursor = 0; // 0 = All, 1+ = process index
let scrollOffset = 0; // 0 = pinned to bottom, >0 = scrolled up N lines
let colorIdx = 0;

// ─── Rendering ──────────────────────────────────────────────────────────────

function getVisibleLogs(): string[] {
  if (selected) {
    const proc = processes.find(p => p.id === selected);
    if (!proc) return [];
    return proc.logs.map(l =>
      l.stream === 'stderr'
        ? red(l.text)
        : l.text
    );
  }
  // All processes — prefix with colored name
  return processes.flatMap(p =>
    p.logs.map(l => {
      const prefix = p.color(`[${p.name}]`);
      const text = l.stream === 'stderr' ? red(l.text) : l.text;
      return `${prefix} ${text}`;
    })
  );
}

function render() {
  const { rows, columns } = process.stdout;
  clearScreen();

  // ── Process list (horizontal, wrapping) ──
  const items: { id: string | null; label: string }[] = [
    { id: null, label: 'All' },
    ...processes.map(p => ({ id: p.id, label: p.name })),
  ];

  // Clamp cursor
  if (cursor >= items.length) cursor = items.length - 1;

  let row = 1;
  let col = 1;
  moveTo(row, col);
  write(bold('connected to dustbucket.com'));

  row++;
  col = 1;
  moveTo(row, col);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const display = ` ${item.label} `;
    const sep = i < items.length - 1 ? '|' : '';
    const width = display.length + sep.length;

    // Wrap to next row if this name won't fit
    if (col + width > columns && col > 1) {
      row++;
      col = 1;
      moveTo(row, col);
    }

    const isSelected = i === cursor;
    const proc = item.id ? processes.find(p => p.id === item.id) : null;

    if (isSelected) {
      write(inverse(display));
    } else if (proc) {
      write(proc.color(display));
    } else {
      write(display);
    }

    if (sep) write(dim(sep));

    col += width;
  }

  // ── Help bar ──
  row++;
  moveTo(row, 1);
  write(dim(' [←→] select  [↑↓] scroll  [q] quit'));

  // ── Log area ──
  const logStart = row + 1;
  const maxLines = rows - logStart;
  if (maxLines <= 0) return;

  const allLogs = getVisibleLogs();
  const totalLogs = allLogs.length;

  // Clamp scroll offset
  const maxScroll = Math.max(0, totalLogs - maxLines);
  if (scrollOffset > maxScroll) scrollOffset = maxScroll;

  const startIdx = totalLogs - maxLines - scrollOffset;
  const visible = allLogs.slice(Math.max(0, startIdx), Math.max(0, startIdx) + maxLines);

  visible.forEach((line, i) => {
    moveTo(logStart + i, 1);
    // Truncate to terminal width (accounting for ANSI codes)
    write(truncateAnsi(line, columns));
  });

  // Scroll indicator
  if (scrollOffset > 0) {
    moveTo(logStart, columns - 10);
    write(inverse(` ↑ +${scrollOffset} `));
  }
}

// Strip ANSI codes for length calculations
function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

// Truncate a string with ANSI codes to N visible characters
function truncateAnsi(s: string, maxLen: number): string {
  let visible = 0;
  let i = 0;
  while (i < s.length && visible < maxLen) {
    if (s[i] === '\x1b') {
      const end = s.indexOf('m', i);
      if (end !== -1) { i = end + 1; continue; }
    }
    visible++;
    i++;
  }
  return s.slice(0, i);
}

// ─── Input Handling ─────────────────────────────────────────────────────────

function handleKey(data: Buffer) {
  const key = data.toString();
  if (key === 'q' || key === '\x03') { shutdown(); return; } // q or Ctrl-C

  // Left/right to cycle through processes
  const allIds = [null, ...processes.map(p => p.id)];
  if (key === '\x1b[D') { // left
    cursor = (cursor - 1 + allIds.length) % allIds.length;
    selected = allIds[cursor];
    scrollOffset = 0;
    render();
    return;
  }
  if (key === '\x1b[C') { // right
    cursor = (cursor + 1) % allIds.length;
    selected = allIds[cursor];
    scrollOffset = 0;
    render();
    return;
  }

  // Scroll in log view
  if (key === '\x1b[A') { scrollOffset++; render(); }
  if (key === '\x1b[B') { scrollOffset = Math.max(0, scrollOffset - 1); render(); }
  // Page up/down
  if (key === '\x1b[5~') { scrollOffset += 20; render(); } // PgUp
  if (key === '\x1b[6~') { scrollOffset = Math.max(0, scrollOffset - 20); render(); } // PgDn
  // Home = scroll to top, End = scroll to bottom
  if (key === '\x1b[H' || key === 'g') { scrollOffset = Infinity; render(); }
  if (key === '\x1b[F' || key === 'G') { scrollOffset = 0; render(); }
}

function shutdown() {
  leaveAltScreen();
  showCursor();
  process.stdin.setRawMode(false);
  process.exit(0);
}

// ─── Process Manager (public API) ───────────────────────────────────────────

function addProcess(id: string, name: string): Proc {
  const proc: Proc = {
    id,
    name,
    color: COLORS[colorIdx++ % COLORS.length],
    logs: [],
    alive: true,
  };
  processes.push(proc);
  render();
  return proc;
}

function pushLog(procId: string, text: string, stream: 'stdout' | 'stderr' = 'stdout') {
  const proc = processes.find(p => p.id === procId);
  if (!proc) return;
  // Split multiline
  for (const line of text.split('\n').filter(Boolean)) {
    proc.logs.push({ text: line, stream, timestamp: Date.now() });
  }
  // Cap per-process log buffer
  if (proc.logs.length > 5000) proc.logs = proc.logs.slice(-3000);
  // Only re-render if we're at the bottom (not scrolled up) or viewing this process
  if (scrollOffset === 0 || selected === procId) {
    render();
  }
}

function markExited(procId: string) {
  const proc = processes.find(p => p.id === procId);
  if (proc) {
    proc.alive = false;
    pushLog(procId, dim('── process exited ──'), 'stderr');
  }
}

// ─── Demo: Simulated Coding Agents ──────────────────────────────────────────

type RepoConfig = {
  url: string;
  intervalRange: [number, number];
};

const REPOS: RepoConfig[] = [
  { url: 'https://github.com/acme/frontend', intervalRange: [300, 1500] },
  { url: 'https://github.com/acme/api-server', intervalRange: [500, 2000] },
  { url: 'https://github.com/acme/shared-utils', intervalRange: [800, 3000] },
];

function repoName(url: string): string {
  const match = url.match(/github\.com\/(.+)$/);
  return match ? match[1] : url;
}

const AGENT_STDOUT: Record<string, string[]> = {
  'acme/frontend': [
    '🔄 Starting dust loop claude (max 10 iterations)...',
    '🌍 Syncing with remote',
    '✨ Found a task. Going to work!',
    '🤖 Starting Claude...',
    '🔧 Read: src/components/LoginForm.tsx',
    '🔧 Grep: "handleSubmit" in src/components/',
    '🔧 Edit: src/components/LoginForm.tsx',
    '🔧 Bash: bun test src/components/LoginForm.test.tsx',
    '────────────────────────────────',
    '✓ 4/4 tests passed',
    '────────────────────────────────',
    '🔧 Write: src/components/AuthProvider.tsx',
    '🔧 Glob: src/**/*.test.tsx',
    '🔧 Bash: bun run lint',
    '✓ lint',
    '✓ typecheck',
    '🏁 Done: success, 8 turns, $0.0342',
    '📋 Completed iteration 1/10',
  ],
  'acme/api-server': [
    '🔄 Starting dust loop claude (max 5 iterations)...',
    '🌍 Syncing with remote',
    '✨ Found a task. Going to work!',
    '🤖 Starting Claude...',
    '🔧 Read: src/routes/users.ts',
    '🔧 Read: src/middleware/auth.ts',
    '🔧 Grep: "validateToken" in src/',
    '🔧 Edit: src/routes/users.ts',
    '🔧 Write: src/routes/users.test.ts',
    '🔧 Bash: bun test src/routes/users.test.ts',
    '────────────────────────────────',
    '✓ 7/7 tests passed',
    '────────────────────────────────',
    '🔧 Bash: bun run typecheck',
    '🔧 TodoWrite: 3 item(s)',
    '☑ Add input validation to POST /users',
    '☑ Write tests for edge cases',
    '☐ Update API documentation',
    '🏁 Done: success, 12 turns, $0.0518',
    '📋 Completed iteration 1/5',
  ],
  'acme/shared-utils': [
    '🔄 Starting dust loop claude (max 3 iterations)...',
    '🌍 Syncing with remote',
    '✨ Found a task. Going to work!',
    '🤖 Starting Claude...',
    '🔧 Read: src/date-utils.ts',
    '🔧 Glob: src/**/*.ts',
    '🔧 Edit: src/date-utils.ts',
    '🔧 Bash: bun test',
    '────────────────────────────────',
    '✓ 12/12 tests passed',
    '────────────────────────────────',
    '🔧 Bash: bun run build',
    '🏁 Done: success, 6 turns, $0.0215',
    '📋 Completed iteration 1/3',
    '😴 No tasks available. Sleeping...',
  ],
};

const AGENT_STDERR: Record<string, string[]> = {
  'acme/frontend': [
    '⚠️  Push blocked: uncommitted changes detected in unattended mode.',
    '✗ typecheck (src/components/AuthProvider.tsx:14 — Type error)',
  ],
  'acme/api-server': [
    '🤖 Claude session ended (error: context window exceeded)',
    '⚠️  Task-only commit detected! You added a task but did not implement it.',
    '✗ 2/7 tests passed',
  ],
  'acme/shared-utils': [
    '✗ build (Cannot find module "./string-utils")',
  ],
};

function simulateProcess(url: string, intervalRange: [number, number]) {
  const name = repoName(url);
  const proc = addProcess(url, name);
  const stdoutLines = AGENT_STDOUT[name] ?? ['doing stuff...'];
  const stderrLines = AGENT_STDERR[name] ?? [];
  let stdoutIdx = 0;

  const tick = () => {
    if (!proc.alive) return;

    // ~15% chance of stderr
    if (stderrLines.length > 0 && Math.random() < 0.15) {
      const line = stderrLines[Math.floor(Math.random() * stderrLines.length)];
      pushLog(url, line, 'stderr');
    } else {
      pushLog(url, stdoutLines[stdoutIdx % stdoutLines.length], 'stdout');
      stdoutIdx++;
    }

    const [min, max] = intervalRange;
    const delay = min + Math.random() * (max - min);
    setTimeout(tick, delay);
  };

  // Start after a small random delay
  setTimeout(tick, Math.random() * 1000);
  return proc;
}

// ─── Boot ───────────────────────────────────────────────────────────────────

enterAltScreen();
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf-8');
process.stdin.on('data', handleKey);
process.stdout.on('resize', render);
process.on('exit', () => { leaveAltScreen(); showCursor(); });
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start simulated coding agents
for (const repo of REPOS) {
  simulateProcess(repo.url, repo.intervalRange);
}

// Simulate a late-joining repo after 5s
setTimeout(() => {
  const lateRepo = 'https://github.com/acme/docs-site';
  AGENT_STDOUT['acme/docs-site'] = [
    '🔄 Starting dust loop claude (max 3 iterations)...',
    '🌍 Syncing with remote',
    '✨ Found a task. Going to work!',
    '🤖 Starting Claude...',
    '🔧 Read: content/guides/getting-started.md',
    '🔧 Edit: content/guides/getting-started.md',
    '🔧 Bash: bun run build',
    '✓ build',
    '🏁 Done: success, 4 turns, $0.0128',
  ];
  AGENT_STDERR['acme/docs-site'] = [
    '✗ build (broken link in getting-started.md)',
  ];
  simulateProcess(lateRepo, [1000, 4000]);
}, 5000);

// Simulate a repo agent finishing after 15s
setTimeout(() => {
  markExited(REPOS[2].url);
}, 15000);

render();
```

I don't want a sub-process for each loop, I just want sub-processes for each invocation of claude. But the terminal UI should look like it's one continuous process.

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Idea is thoroughly researched with relevant codebase context
- [ ] Open questions are added for any ambiguous or underspecified aspects
- [ ] Idea file is updated with findings
