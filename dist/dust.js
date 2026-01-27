// lib/cli/entry.ts
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";

// lib/cli/check.ts
import { spawn } from "node:child_process";

// lib/cli/validate.ts
import { dirname, resolve } from "node:path";
var REQUIRED_HEADINGS = ["## Goals", "## Blocked by", "## Definition of done"];
var SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*\.md$/;
function validateFilename(filePath) {
  const parts = filePath.split("/");
  const filename = parts[parts.length - 1];
  if (!SLUG_PATTERN.test(filename)) {
    return {
      file: filePath,
      message: `Filename "${filename}" does not match slug-style naming`
    };
  }
  return null;
}
function validateTaskHeadings(filePath, content) {
  const violations = [];
  for (const heading of REQUIRED_HEADINGS) {
    if (!content.includes(heading)) {
      violations.push({
        file: filePath,
        message: `Missing required heading: "${heading}"`
      });
    }
  }
  return violations;
}
function validateLinks(filePath, content, fs) {
  const violations = [];
  const lines = content.split(`
`);
  const fileDir = dirname(filePath);
  for (let i = 0;i < lines.length; i++) {
    const line = lines[i];
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match = linkPattern.exec(line);
    while (match) {
      const linkTarget = match[2];
      if (!linkTarget.startsWith("http://") && !linkTarget.startsWith("https://") && !linkTarget.startsWith("#")) {
        const targetPath = linkTarget.split("#")[0];
        const resolvedPath = resolve(fileDir, targetPath);
        if (!fs.exists(resolvedPath)) {
          violations.push({
            file: filePath,
            message: `Broken link: "${linkTarget}"`,
            line: i + 1
          });
        }
      }
      match = linkPattern.exec(line);
    }
  }
  return violations;
}
var SEMANTIC_RULES = [
  {
    section: "## Goals",
    requiredPath: "/.dust/goals/",
    description: "goal"
  },
  {
    section: "## Blocked by",
    requiredPath: "/.dust/tasks/",
    description: "task"
  }
];
function validateSemanticLinks(filePath, content) {
  const violations = [];
  const lines = content.split(`
`);
  const fileDir = dirname(filePath);
  let currentSection = null;
  for (let i = 0;i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      currentSection = line;
      continue;
    }
    const rule = SEMANTIC_RULES.find((r) => r.section === currentSection);
    if (!rule)
      continue;
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match = linkPattern.exec(line);
    while (match) {
      const linkTarget = match[2];
      if (linkTarget.startsWith("#")) {
        violations.push({
          file: filePath,
          message: `Link in "${rule.section}" must point to a ${rule.description} file, not an anchor: "${linkTarget}"`,
          line: i + 1
        });
        match = linkPattern.exec(line);
        continue;
      }
      if (linkTarget.startsWith("http://") || linkTarget.startsWith("https://")) {
        violations.push({
          file: filePath,
          message: `Link in "${rule.section}" must point to a ${rule.description} file, not an external URL: "${linkTarget}"`,
          line: i + 1
        });
        match = linkPattern.exec(line);
        continue;
      }
      const targetPath = linkTarget.split("#")[0];
      const resolvedPath = resolve(fileDir, targetPath);
      if (!resolvedPath.includes(rule.requiredPath)) {
        violations.push({
          file: filePath,
          message: `Link in "${rule.section}" must point to a ${rule.description} file: "${linkTarget}"`,
          line: i + 1
        });
      }
      match = linkPattern.exec(line);
    }
  }
  return violations;
}
async function validate(ctx, fs, _args, glob) {
  const dustPath = `${ctx.cwd}/.dust`;
  if (!fs.exists(dustPath)) {
    ctx.stderr("Error: .dust directory not found");
    ctx.stderr("Run 'dust init' to initialize a Dust repository");
    return { exitCode: 1 };
  }
  const violations = [];
  ctx.stdout("Validating links in .dust/...");
  for await (const file of glob.scan(dustPath)) {
    if (!file.endsWith(".md"))
      continue;
    const filePath = `${dustPath}/${file}`;
    const content = await fs.readFile(filePath);
    violations.push(...validateLinks(filePath, content, fs));
  }
  const tasksPath = `${dustPath}/tasks`;
  if (fs.exists(tasksPath)) {
    ctx.stdout("Validating task files in .dust/tasks/...");
    for await (const file of glob.scan(tasksPath)) {
      if (!file.endsWith(".md"))
        continue;
      const filePath = `${tasksPath}/${file}`;
      const content = await fs.readFile(filePath);
      const filenameViolation = validateFilename(filePath);
      if (filenameViolation) {
        violations.push(filenameViolation);
      }
      violations.push(...validateTaskHeadings(filePath, content));
      violations.push(...validateSemanticLinks(filePath, content));
    }
  }
  if (violations.length === 0) {
    ctx.stdout("All validations passed!");
    return { exitCode: 0 };
  }
  ctx.stderr(`Found ${violations.length} violation(s):`);
  ctx.stderr("");
  for (const v of violations) {
    const location = v.line ? `:${v.line}` : "";
    ctx.stderr(`  ${v.file}${location}`);
    ctx.stderr(`    ${v.message}`);
  }
  return { exitCode: 1 };
}

// lib/cli/check.ts
function createProcessRunner(spawnFn) {
  return {
    spawn: (command, args, options) => {
      return new Promise((resolve2) => {
        const proc = spawnFn(command, args, options);
        proc.on("close", (code) => resolve2(code ?? 1));
        proc.on("error", () => resolve2(1));
      });
    }
  };
}
var defaultProcessRunner = createProcessRunner(spawn);
async function check(ctx, fs, _args, runner = defaultProcessRunner, glob) {
  if (glob) {
    const validationResult = await validate(ctx, fs, [], glob);
    if (validationResult.exitCode !== 0) {
      return validationResult;
    }
    ctx.stdout("");
  }
  const hookPath = `${ctx.cwd}/.dust/hooks/check`;
  if (!fs.exists(hookPath)) {
    ctx.stderr("Error: No check hook found at .dust/hooks/check");
    ctx.stderr("");
    ctx.stderr("To create a check hook:");
    ctx.stderr("  1. Create the hooks directory: mkdir -p .dust/hooks");
    ctx.stderr("  2. Create the check script: touch .dust/hooks/check");
    ctx.stderr("  3. Make it executable: chmod +x .dust/hooks/check");
    ctx.stderr("  4. Add your quality checks (tests, linting, etc.)");
    return { exitCode: 1 };
  }
  const exitCode = await runner.spawn(hookPath, [], {
    cwd: ctx.cwd,
    stdio: "inherit"
  });
  return { exitCode };
}

// lib/cli/templates.ts
import { readFileSync } from "node:fs";
import { dirname as dirname2, join } from "node:path";
import { fileURLToPath } from "node:url";
var __dirname2 = dirname2(fileURLToPath(import.meta.url));
var templatesDir = join(__dirname2, "../templates");
function loadTemplate(name, variables = {}) {
  const templatePath = join(templatesDir, `${name}.txt`);
  let content = readFileSync(templatePath, "utf-8");
  for (const [key, value] of Object.entries(variables)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }
  return content;
}

// lib/cli/claude.ts
var CLAUDE_SUBCOMMANDS = [
  "work",
  "tasks",
  "goals",
  "ideas",
  "help"
];
function generateClaudeGreeting(settings) {
  return loadTemplate("claude-greeting", { bin: settings.binaryPath });
}
function generateWorkInstructions(settings) {
  return loadTemplate("claude-work", { bin: settings.binaryPath });
}
function generateTasksInstructions(settings) {
  return loadTemplate("claude-tasks", { bin: settings.binaryPath });
}
function generateGoalsInstructions(settings) {
  return loadTemplate("claude-goals", { bin: settings.binaryPath });
}
function generateIdeasInstructions(settings) {
  return loadTemplate("claude-ideas", { bin: settings.binaryPath });
}
function generateClaudeHelp(settings) {
  return loadTemplate("claude-help", { bin: settings.binaryPath });
}
async function claude(ctx, args, settings) {
  const subcommand = args[0];
  if (!subcommand) {
    ctx.stdout(generateClaudeGreeting(settings));
    return { exitCode: 0 };
  }
  switch (subcommand) {
    case "work":
      ctx.stdout(generateWorkInstructions(settings));
      return { exitCode: 0 };
    case "tasks":
      ctx.stdout(generateTasksInstructions(settings));
      return { exitCode: 0 };
    case "goals":
      ctx.stdout(generateGoalsInstructions(settings));
      return { exitCode: 0 };
    case "ideas":
      ctx.stdout(generateIdeasInstructions(settings));
      return { exitCode: 0 };
    case "help":
      ctx.stdout(generateClaudeHelp(settings));
      return { exitCode: 0 };
    default:
      ctx.stderr(`Unknown subcommand: ${subcommand}`);
      ctx.stderr(`Available: ${CLAUDE_SUBCOMMANDS.join(", ")}`);
      return { exitCode: 1 };
  }
}

// lib/cli/init.ts
var DUST_DIRECTORIES = ["goals", "ideas", "tasks", "facts"];
var DEFAULT_GOAL = `# Project Goal

Describe the high-level mission of this project.
`;
async function init(ctx, fs, _args) {
  const dustPath = `${ctx.cwd}/.dust`;
  if (fs.exists(dustPath)) {
    ctx.stderr("Error: .dust directory already exists");
    return { exitCode: 1 };
  }
  await fs.mkdir(dustPath, { recursive: true });
  for (const dir of DUST_DIRECTORIES) {
    await fs.mkdir(`${dustPath}/${dir}`, { recursive: true });
  }
  await fs.writeFile(`${dustPath}/goals/project-goal.md`, DEFAULT_GOAL);
  ctx.stdout("Initialized Dust repository in .dust/");
  ctx.stdout(`Created directories: ${DUST_DIRECTORIES.join(", ")}`);
  ctx.stdout("Created initial goal: .dust/goals/project-goal.md");
  return { exitCode: 0 };
}

// lib/cli/list.ts
var VALID_TYPES = ["tasks", "ideas", "goals", "facts"];
function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}
async function list(ctx, fs, args) {
  const dustPath = `${ctx.cwd}/.dust`;
  if (!fs.exists(dustPath)) {
    ctx.stderr("Error: .dust directory not found");
    ctx.stderr("Run 'dust init' to initialize a Dust repository");
    return { exitCode: 1 };
  }
  const typesToList = args.length === 0 ? [...VALID_TYPES] : args.filter((a) => VALID_TYPES.includes(a));
  if (args.length > 0 && typesToList.length === 0) {
    ctx.stderr(`Invalid type: ${args[0]}`);
    ctx.stderr(`Valid types: ${VALID_TYPES.join(", ")}`);
    return { exitCode: 1 };
  }
  for (const type of typesToList) {
    const dirPath = `${dustPath}/${type}`;
    if (!fs.exists(dirPath)) {
      continue;
    }
    const files = await fs.readdir(dirPath);
    const mdFiles = files.filter((f) => f.endsWith(".md")).sort();
    if (mdFiles.length === 0) {
      continue;
    }
    ctx.stdout(`${type}:`);
    for (const file of mdFiles) {
      const filePath = `${dirPath}/${file}`;
      const content = await fs.readFile(filePath);
      const title = extractTitle(content);
      const name = file.replace(/\.md$/, "");
      if (title) {
        ctx.stdout(`  ${name} - ${title}`);
      } else {
        ctx.stdout(`  ${name}`);
      }
    }
    ctx.stdout("");
  }
  return { exitCode: 0 };
}

// lib/cli/next.ts
function extractTitle2(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}
function extractBlockedBy(content) {
  const blockedByMatch = content.match(/^## Blocked by\s*\n([\s\S]*?)(?=\n## |\n*$)/m);
  if (!blockedByMatch) {
    return [];
  }
  const section = blockedByMatch[1].trim();
  if (section === "(none)") {
    return [];
  }
  const linkPattern = /\[.*?\]\(([^)]+\.md)\)/g;
  const blockers = [];
  let match = linkPattern.exec(section);
  while (match !== null) {
    blockers.push(match[1]);
    match = linkPattern.exec(section);
  }
  return blockers;
}
async function next(ctx, fs, _args) {
  const dustPath = `${ctx.cwd}/.dust`;
  if (!fs.exists(dustPath)) {
    ctx.stderr("Error: .dust directory not found");
    ctx.stderr("Run 'dust init' to initialize a Dust repository");
    return { exitCode: 1 };
  }
  const tasksPath = `${dustPath}/tasks`;
  if (!fs.exists(tasksPath)) {
    return { exitCode: 0 };
  }
  const files = await fs.readdir(tasksPath);
  const mdFiles = files.filter((f) => f.endsWith(".md")).sort();
  if (mdFiles.length === 0) {
    return { exitCode: 0 };
  }
  const existingTasks = new Set(mdFiles);
  const unblockedTasks = [];
  for (const file of mdFiles) {
    const filePath = `${tasksPath}/${file}`;
    const content = await fs.readFile(filePath);
    const blockers = extractBlockedBy(content);
    const hasIncompleteBlocker = blockers.some((blocker) => existingTasks.has(blocker));
    if (!hasIncompleteBlocker) {
      const title = extractTitle2(content);
      const name = file.replace(/\.md$/, "");
      unblockedTasks.push({ name, title });
    }
  }
  if (unblockedTasks.length === 0) {
    return { exitCode: 0 };
  }
  ctx.stdout("Next tasks:");
  for (const task of unblockedTasks) {
    if (task.title) {
      ctx.stdout(`  ${task.name} - ${task.title}`);
    } else {
      ctx.stdout(`  ${task.name}`);
    }
  }
  return { exitCode: 0 };
}

// lib/cli/prompt.ts
async function prompt(ctx, fs, args) {
  const promptsDir = `${ctx.cwd}/prompts`;
  if (args.length === 0) {
    ctx.stderr("Usage: dust prompt <name>");
    ctx.stderr("Example: dust prompt work");
    return { exitCode: 1 };
  }
  const promptName = args[0];
  const promptFile = `${promptsDir}/${promptName}.md`;
  if (!fs.exists(promptFile)) {
    ctx.stderr(`Error: Prompt '${promptName}' not found`);
    ctx.stderr("Available prompts:");
    try {
      const files = await fs.readdir(promptsDir);
      const prompts = files.filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""));
      for (const p of prompts) {
        ctx.stderr(`  ${p}`);
      }
    } catch {
      ctx.stderr("  (no prompts directory found)");
    }
    return { exitCode: 1 };
  }
  const content = await fs.readFile(promptFile);
  ctx.stdout(content);
  return { exitCode: 0 };
}

// lib/cli/settings.ts
import { join as join2 } from "node:path";
var DEFAULT_SETTINGS = {
  binaryPath: "dust"
};
async function loadSettings(cwd, fs) {
  const settingsPath = join2(cwd, ".dust", "config", "settings.json");
  if (!fs.exists(settingsPath)) {
    return DEFAULT_SETTINGS;
  }
  try {
    const content = await fs.readFile(settingsPath);
    const parsed = JSON.parse(content);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// lib/cli/main.ts
var COMMANDS = [
  "init",
  "prompt",
  "validate",
  "list",
  "next",
  "check",
  "claude",
  "help"
];
function generateHelpText(settings) {
  return loadTemplate("help", { bin: settings.binaryPath });
}
var HELP_TEXT = generateHelpText({ binaryPath: "dust" });
function isHelpRequest(command) {
  return !command || command === "help" || command === "--help" || command === "-h";
}
function isValidCommand(command) {
  return COMMANDS.includes(command);
}
async function runCommand(command, commandArgs, ctx, fs, glob, settings) {
  switch (command) {
    case "init":
      return init(ctx, fs, commandArgs);
    case "prompt":
      return prompt(ctx, fs, commandArgs);
    case "validate":
      return validate(ctx, fs, commandArgs, glob);
    case "list":
      return list(ctx, fs, commandArgs);
    case "next":
      return next(ctx, fs, commandArgs);
    case "check":
      return check(ctx, fs, commandArgs, defaultProcessRunner, glob);
    case "claude":
      return claude(ctx, commandArgs, settings);
    case "help":
      ctx.stdout(generateHelpText(settings));
      return { exitCode: 0 };
  }
}
async function main(options) {
  const { args, ctx, fs, glob } = options;
  const command = args[0];
  const commandArgs = args.slice(1);
  const settings = await loadSettings(ctx.cwd, fs);
  const helpText = generateHelpText(settings);
  if (isHelpRequest(command)) {
    ctx.stdout(helpText);
    return { exitCode: 0 };
  }
  if (!isValidCommand(command)) {
    ctx.stderr(`Unknown command: ${command}`);
    ctx.stderr(`Run '${settings.binaryPath} help' for available commands`);
    return { exitCode: 1 };
  }
  return runCommand(command, commandArgs, ctx, fs, glob, settings);
}

// lib/cli/entry.ts
var fs = {
  exists: existsSync,
  readFile: (path) => readFile(path, "utf-8"),
  writeFile: (path, content) => writeFile(path, content, "utf-8"),
  mkdir: async (path, options) => {
    await mkdir(path, options);
  },
  readdir: (path) => readdir(path)
};
var glob = {
  scan: async function* (dir) {
    for (const entry of await readdir(dir, { recursive: true })) {
      if (entry.endsWith(".md"))
        yield entry;
    }
  }
};
var result = await main({
  args: process.argv.slice(2),
  ctx: {
    cwd: process.cwd(),
    stdout: console.log,
    stderr: console.error
  },
  fs,
  glob
});
process.exit(result.exitCode);
