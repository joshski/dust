/**
 * Main entry point for dust CLI
 *
 * This module contains all the command routing, help text, and adapter setup
 * so that bin/dust can be minimal.
 */

import type { CommandContext, CommandResult, FileSystem } from "./types";
import type { GlobScanner } from "./validate";
import { init } from "./init";
import { prompt } from "./prompt";
import { validate } from "./validate";
import { list } from "./list";
import { next } from "./next";
import { check } from "./check";

export const COMMANDS = [
  "init",
  "prompt",
  "validate",
  "list",
  "next",
  "check",
  "help",
] as const;

export type Command = (typeof COMMANDS)[number];

export const HELP_TEXT = `dust - A lightweight planning system for human-AI collaboration

Usage: dust <command> [options]

Commands:
  init              Initialize a new Dust repository
  prompt <name>     Output a prompt by name (e.g., dust prompt work)
  validate          Run validation checks on .dust/ files
  list [type]       List items (tasks, ideas, goals, facts)
  next              Show tasks ready to work on (not blocked)
  check             Run project-defined quality gate hook
  help              Show this help message

Examples:
  dust init
  dust prompt work
  dust validate
  dust list tasks
  dust list
  dust next
  dust check
`;

export interface MainOptions {
  args: string[];
  ctx: CommandContext;
  fs: FileSystem;
  glob: GlobScanner;
}

export function isHelpRequest(command: string | undefined): boolean {
  return !command || command === "help" || command === "--help" || command === "-h";
}

export function isValidCommand(command: string): command is Command {
  return COMMANDS.includes(command as Command);
}

export async function runCommand(
  command: Command,
  commandArgs: string[],
  ctx: CommandContext,
  fs: FileSystem,
  glob: GlobScanner
): Promise<CommandResult> {
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
      return check(ctx, fs, commandArgs, undefined, glob);
    case "help":
      ctx.stdout(HELP_TEXT);
      return { exitCode: 0 };
  }
}

export async function main(options: MainOptions): Promise<CommandResult> {
  const { args, ctx, fs, glob } = options;
  const command = args[0];
  const commandArgs = args.slice(1);

  if (isHelpRequest(command)) {
    ctx.stdout(HELP_TEXT);
    return { exitCode: 0 };
  }

  if (!isValidCommand(command)) {
    ctx.stderr(`Unknown command: ${command}`);
    ctx.stderr(`Run 'dust help' for available commands`);
    return { exitCode: 1 };
  }

  return runCommand(command, commandArgs, ctx, fs, glob);
}
