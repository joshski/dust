/**
 * Entry point for bundled CLI builds (Node.js target)
 */
import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { main } from "./main";
import type { FileSystem } from "./types";
import type { GlobScanner } from "./validate";

const fs: FileSystem = {
  exists: existsSync,
  readFile: (path) => readFile(path, "utf-8"),
  writeFile: (path, content) => writeFile(path, content, "utf-8"),
  mkdir: (path, options) => mkdir(path, options),
  readdir: (path) => readdir(path),
};

const glob: GlobScanner = {
  scan: async function* (dir) {
    for (const entry of await readdir(dir, { recursive: true })) {
      if (entry.endsWith(".md")) yield entry;
    }
  },
};

const result = await main({
  args: process.argv.slice(2),
  ctx: {
    cwd: process.cwd(),
    stdout: console.log,
    stderr: console.error,
  },
  fs,
  glob,
});

process.exit(result.exitCode);
