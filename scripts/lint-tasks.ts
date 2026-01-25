#!/usr/bin/env bun

/**
 * Task Linter - Validates Dust task files conform to the required structure.
 *
 * Usage: bun scripts/lint-tasks.ts
 */

import { existsSync } from "node:fs";
import { validateTaskFile, type Violation, type FileSystem } from "../lib/task-linter";

const TASKS_DIR = ".dust/tasks";

const nodeFs: FileSystem = {
  exists: existsSync,
};

async function main() {
  console.log("🔍 Linting task files in", TASKS_DIR, "\n");

  const glob = new Bun.Glob("**/*.md");
  const files: string[] = [];

  for await (const file of glob.scan(TASKS_DIR)) {
    files.push(`${TASKS_DIR}/${file}`);
  }

  if (files.length === 0) {
    console.log("No task files found.");
    process.exit(0);
  }

  console.log(`Found ${files.length} task file(s)\n`);

  const violations: Violation[] = [];

  for (const filePath of files) {
    const content = await Bun.file(filePath).text();
    violations.push(...validateTaskFile(filePath, content, nodeFs));
  }

  if (violations.length === 0) {
    console.log("✅ All task files are valid!");
    process.exit(0);
  }

  console.log(`❌ Found ${violations.length} violation(s):\n`);

  for (const violation of violations) {
    const location = violation.line ? `:${violation.line}` : "";
    console.log(`  ${violation.file}${location}`);
    console.log(`    → ${violation.message}\n`);
  }

  process.exit(1);
}

main();
