/**
 * dust check - Execute project-defined quality gate hook
 *
 * Looks for an executable hook at .dust/hooks/check and runs it.
 * Forwards the exit code from the hook.
 */

import { spawn } from "node:child_process";
import type { CommandContext, CommandResult, FileSystem } from "./types";

export interface ProcessRunner {
  spawn: (
    command: string,
    args: string[],
    options: { cwd: string; stdio: "inherit" }
  ) => Promise<number>;
}

export const defaultProcessRunner: ProcessRunner = {
  spawn: (command, args, options) => {
    return new Promise((resolve) => {
      const proc = spawn(command, args, options);
      proc.on("close", (code) => resolve(code ?? 1));
      proc.on("error", () => resolve(1));
    });
  },
};

export async function check(
  ctx: CommandContext,
  fs: FileSystem,
  _args: string[],
  runner: ProcessRunner = defaultProcessRunner
): Promise<CommandResult> {
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
    stdio: "inherit",
  });

  return { exitCode };
}
