/**
 * Task Linter - Core validation logic for Dust task files.
 *
 * This module exports testable validation functions with dependency injection
 * for file system access.
 */

import { basename, dirname, resolve } from "node:path";

export const REQUIRED_HEADINGS = [
  "## Goals",
  "## Blocked by",
  "## Definition of done",
];
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*\.md$/;
export const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

export interface Violation {
  file: string;
  message: string;
  line?: number;
}

export interface FileSystem {
  exists: (path: string) => boolean;
}

export function validateFilename(filePath: string): Violation | null {
  const filename = basename(filePath);
  if (!SLUG_PATTERN.test(filename)) {
    return {
      file: filePath,
      message: `Filename "${filename}" does not match slug-style naming (lowercase alphanumeric and hyphens only)`,
    };
  }
  return null;
}

export function validateHeadings(
  filePath: string,
  content: string
): Violation[] {
  const violations: Violation[] = [];
  for (const heading of REQUIRED_HEADINGS) {
    if (!content.includes(heading)) {
      violations.push({
        file: filePath,
        message: `Missing required heading: "${heading}"`,
      });
    }
  }
  return violations;
}

export function validateLinks(
  filePath: string,
  content: string,
  fs: FileSystem
): Violation[] {
  const violations: Violation[] = [];
  const lines = content.split("\n");
  const fileDir = dirname(filePath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match: RegExpExecArray | null;

    // Create a new regex for each line to avoid lastIndex issues
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

    while ((match = linkPattern.exec(line))) {
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

        if (!fs.exists(resolvedPath)) {
          violations.push({
            file: filePath,
            message: `Broken link: "${linkTarget}" does not resolve to an existing file`,
            line: i + 1,
          });
        }
      }
    }
  }

  return violations;
}

export function validateTaskFile(
  filePath: string,
  content: string,
  fs: FileSystem
): Violation[] {
  const violations: Violation[] = [];

  const filenameViolation = validateFilename(filePath);
  if (filenameViolation) {
    violations.push(filenameViolation);
  }

  violations.push(...validateHeadings(filePath, content));
  violations.push(...validateLinks(filePath, content, fs));

  return violations;
}
