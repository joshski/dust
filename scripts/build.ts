#!/usr/bin/env bun
/**
 * Build script for compiling the Dust CLI to JavaScript
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const SHEBANG = "#!/usr/bin/env node\n";
const OUTFILE = "dist/dust.js";
const ENTRYPOINT = "lib/cli/entry.ts";

// Ensure dist directory exists
if (!existsSync("dist")) {
  mkdirSync("dist");
}

// Run bun build
console.log("Building CLI...");
execSync(`bun build ${ENTRYPOINT} --target node --outfile ${OUTFILE}`, {
  stdio: "inherit",
});

// Prepend shebang
console.log("Adding shebang...");
const content = readFileSync(OUTFILE, "utf-8");
writeFileSync(OUTFILE, SHEBANG + content);

console.log("Build complete: " + OUTFILE);
