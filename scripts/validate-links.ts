#!/usr/bin/env bun

/**
 * Link Validator - Validates all relative links across Dust markdown files.
 *
 * Usage: bun scripts/validate-links.ts
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DUST_DIR = ".dust";
const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

interface BrokenLink {
  file: string;
  line: number;
  linkText: string;
  target: string;
}

const brokenLinks: BrokenLink[] = [];

function validateLinks(filePath: string, content: string): void {
  const lines = content.split("\n");
  const fileDir = dirname(filePath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match: RegExpExecArray | null;

    // Reset regex lastIndex for each line
    LINK_PATTERN.lastIndex = 0;

    while ((match = LINK_PATTERN.exec(line))) {
      const linkText = match[1];
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
          brokenLinks.push({
            file: filePath,
            line: i + 1,
            linkText,
            target: linkTarget,
          });
        }
      }
    }
  }
}

async function main() {
  console.log("🔗 Validating links in", DUST_DIR, "\n");

  const glob = new Bun.Glob("**/*.md");
  const files: string[] = [];

  for await (const file of glob.scan(DUST_DIR)) {
    files.push(`${DUST_DIR}/${file}`);
  }

  if (files.length === 0) {
    console.log("No markdown files found.");
    process.exit(0);
  }

  console.log(`Found ${files.length} markdown file(s)\n`);

  for (const filePath of files) {
    const content = await Bun.file(filePath).text();
    validateLinks(filePath, content);
  }

  if (brokenLinks.length === 0) {
    console.log("✅ All links are valid!");
    process.exit(0);
  }

  console.log(`❌ Found ${brokenLinks.length} broken link(s):\n`);

  for (const link of brokenLinks) {
    console.log(`  ${link.file}:${link.line}`);
    console.log(`    → [${link.linkText}](${link.target})\n`);
  }

  process.exit(1);
}

main();
