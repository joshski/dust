#!/usr/bin/env bun

/**
 * Task Linter - Validates Dust task files conform to the required structure.
 *
 * Usage: bun scripts/lint-tasks.ts
 */

import { existsSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

const TASKS_DIR = ".dust/tasks";
const REQUIRED_HEADINGS = ["## Goals", "## Blocked by", "## Definition of done"];
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*\.md$/;
const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

interface Violation {
  file: string;
  message: string;
  line?: number;
}

const violations: Violation[] = [];

function addViolation(file: string, message: string, line?: number) {
  violations.push({ file, message, line });
}

function validateFilename(filePath: string): void {
  const filename = basename(filePath);
  if (!SLUG_PATTERN.test(filename)) {
    addViolation(
      filePath,
      `Filename "${filename}" does not match slug-style naming (lowercase alphanumeric and hyphens only)`
    );
  }
}

function validateHeadings(filePath: string, content: string): void {
  for (const heading of REQUIRED_HEADINGS) {
    if (!content.includes(heading)) {
      addViolation(filePath, `Missing required heading: "${heading}"`);
    }
  }
}

function validateLinks(filePath: string, content: string): void {
  const lines = content.split("\n");
  const fileDir = dirname(filePath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match: RegExpExecArray | null;

    // Reset regex lastIndex for each line
    LINK_PATTERN.lastIndex = 0;

    while ((match = LINK_PATTERN.exec(line))) {
      const linkTarget = match[2];

      // Skip external links and anchors
      if (
        linkTarget.startsWith("http://") ||
        linkTarget.startsWith("https://") ||
        linkTarget.startsWith("#")
      ) {
        continue;
      }

      // Remove any anchor from the link
      const targetPath = linkTarget.split("#")[0];

      if (targetPath) {
        const resolvedPath = resolve(fileDir, targetPath);

        if (!existsSync(resolvedPath)) {
          addViolation(
            filePath,
            `Broken link: "${linkTarget}" does not resolve to an existing file`,
            i + 1
          );
        }
      }
    }
  }
}

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

  for (const filePath of files) {
    const content = await Bun.file(filePath).text();

    validateFilename(filePath);
    validateHeadings(filePath, content);
    validateLinks(filePath, content);
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
