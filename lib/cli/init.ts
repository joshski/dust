/**
 * dust init - Initialize a new Dust repository
 */

import type { CommandContext, CommandResult, FileSystem } from "./types";

const DUST_DIRECTORIES = ["goals", "ideas", "tasks", "facts"];

const DEFAULT_GOAL = `# Project Goal

Describe the high-level mission of this project.
`;

export async function init(
  ctx: CommandContext,
  fs: FileSystem,
  args: string[]
): Promise<CommandResult> {
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
  ctx.stdout("Created directories: " + DUST_DIRECTORIES.join(", "));
  ctx.stdout("Created initial goal: .dust/goals/project-goal.md");

  return { exitCode: 0 };
}
