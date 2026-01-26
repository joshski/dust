#!/usr/bin/env bun
/**
 * Build script for compiling the Dust CLI to JavaScript
 */
import { execSync } from "node:child_process";

console.log("Building CLI...");
execSync("bun build lib/cli/entry.ts --target node --outfile dist/dust.js", {
  stdio: "inherit",
});
console.log("Build complete: dist/dust.js");
