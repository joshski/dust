/**
 * dust next - List tasks that are ready to work on
 *
 * Displays tasks from .dust/tasks/ that are not blocked by any incomplete tasks.
 * A task is blocked if its "## Blocked by" section references task files that still exist.
 */

import type { CommandContext, CommandResult, FileSystem } from "./types";

function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function extractBlockedBy(content: string): string[] {
  // Find the "## Blocked by" section
  const blockedByMatch = content.match(/^## Blocked by\s*\n([\s\S]*?)(?=\n## |\n*$)/m);
  if (!blockedByMatch) {
    return [];
  }

  const section = blockedByMatch[1].trim();

  // Check for "(none)" which means no blockers
  if (section === "(none)") {
    return [];
  }

  // Extract markdown links: [text](file.md)
  const linkPattern = /\[.*?\]\(([^)]+\.md)\)/g;
  const blockers: string[] = [];
  let match;

  while ((match = linkPattern.exec(section)) !== null) {
    blockers.push(match[1]);
  }

  return blockers;
}

export async function next(
  ctx: CommandContext,
  fs: FileSystem,
  _args: string[]
): Promise<CommandResult> {
  const dustPath = `${ctx.cwd}/.dust`;

  if (!fs.exists(dustPath)) {
    ctx.stderr("Error: .dust directory not found");
    ctx.stderr("Run 'dust init' to initialize a Dust repository");
    return { exitCode: 1 };
  }

  const tasksPath = `${dustPath}/tasks`;

  if (!fs.exists(tasksPath)) {
    // No tasks directory means no tasks to show
    return { exitCode: 0 };
  }

  const files = await fs.readdir(tasksPath);
  const mdFiles = files.filter((f) => f.endsWith(".md")).sort();

  if (mdFiles.length === 0) {
    return { exitCode: 0 };
  }

  // Create a set of existing task files for quick lookup
  const existingTasks = new Set(mdFiles);

  // Find unblocked tasks
  const unblockedTasks: Array<{ name: string; title: string | null }> = [];

  for (const file of mdFiles) {
    const filePath = `${tasksPath}/${file}`;
    const content = await fs.readFile(filePath);
    const blockers = extractBlockedBy(content);

    // Check if any blockers still exist (are incomplete)
    const hasIncompleteBlocker = blockers.some((blocker) => existingTasks.has(blocker));

    if (!hasIncompleteBlocker) {
      const title = extractTitle(content);
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
