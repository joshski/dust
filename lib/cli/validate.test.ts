import { describe, expect, test } from "vitest";
import {
  validate,
  validateFilename,
  validateTaskHeadings,
  validateLinks,
  type GlobScanner,
} from "./validate";
import type { CommandContext, FileSystem } from "./types";

function createMockContext(): CommandContext & {
  stdoutLines: string[];
  stderrLines: string[];
} {
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];
  return {
    cwd: "/project",
    stdout: (msg: string) => stdoutLines.push(msg),
    stderr: (msg: string) => stderrLines.push(msg),
    stdoutLines,
    stderrLines,
  };
}

function createMockFs(files: Map<string, string> = new Map()): FileSystem {
  const paths = new Set(files.keys());
  // Also add directory paths
  for (const path of files.keys()) {
    let dir = path;
    while (dir.includes("/")) {
      dir = dir.substring(0, dir.lastIndexOf("/"));
      if (dir) paths.add(dir);
    }
  }

  return {
    exists: (path: string) => paths.has(path),
    readFile: async (path: string) => files.get(path) || "",
    writeFile: async () => {},
    mkdir: async () => {},
    readdir: async () => [],
  };
}

function createMockGlob(files: string[]): GlobScanner {
  return {
    scan: async function* (dir: string) {
      for (const file of files) {
        if (file.startsWith(dir + "/")) {
          yield file.slice(dir.length + 1);
        }
      }
    },
  };
}

describe("validateFilename", () => {
  test("accepts valid slug names", () => {
    expect(validateFilename("my-task.md")).toBeNull();
    expect(validateFilename("task.md")).toBeNull();
    expect(validateFilename("task-v2.md")).toBeNull();
    expect(validateFilename("/path/to/my-task.md")).toBeNull();
  });

  test("rejects invalid names", () => {
    expect(validateFilename("MyTask.md")).not.toBeNull();
    expect(validateFilename("my_task.md")).not.toBeNull();
    expect(validateFilename("-task.md")).not.toBeNull();
    expect(validateFilename("task-.md")).not.toBeNull();
  });
});

describe("validateTaskHeadings", () => {
  test("returns no violations for valid task", () => {
    const content = `# Task
## Goals
## Blocked by
## Definition of done`;

    const violations = validateTaskHeadings("task.md", content);
    expect(violations).toHaveLength(0);
  });

  test("reports missing headings", () => {
    const content = `# Task
## Goals`;

    const violations = validateTaskHeadings("task.md", content);
    expect(violations).toHaveLength(2);
  });
});

describe("validateLinks", () => {
  test("returns no violations for valid links", () => {
    const content = `[Goal](../goals/goal.md)`;
    const fs = createMockFs(
      new Map([["/project/.dust/goals/goal.md", "content"]])
    );

    const violations = validateLinks(
      "/project/.dust/tasks/task.md",
      content,
      fs
    );
    expect(violations).toHaveLength(0);
  });

  test("reports broken links", () => {
    const content = `[Missing](../goals/missing.md)`;
    const fs = createMockFs();

    const violations = validateLinks(
      "/project/.dust/tasks/task.md",
      content,
      fs
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("Broken link");
  });

  test("skips external links", () => {
    const content = `[External](https://example.com)`;
    const fs = createMockFs();

    const violations = validateLinks(
      "/project/.dust/tasks/task.md",
      content,
      fs
    );
    expect(violations).toHaveLength(0);
  });

  test("skips anchor links", () => {
    const content = `[Section](#section)`;
    const fs = createMockFs();

    const violations = validateLinks(
      "/project/.dust/tasks/task.md",
      content,
      fs
    );
    expect(violations).toHaveLength(0);
  });

  test("includes line numbers", () => {
    const content = `Line 1
Line 2
[Missing](../goals/missing.md)`;
    const fs = createMockFs();

    const violations = validateLinks(
      "/project/.dust/tasks/task.md",
      content,
      fs
    );
    expect(violations[0].line).toBe(3);
  });
});

describe("validate command", () => {
  test("fails if .dust not found", async () => {
    const ctx = createMockContext();
    const fs = createMockFs();
    const glob = createMockGlob([]);

    const result = await validate(ctx, fs, [], glob);

    expect(result.exitCode).toBe(1);
    expect(ctx.stderrLines.join("\n")).toContain(".dust directory not found");
  });

  test("passes with valid files", async () => {
    const ctx = createMockContext();
    const fs = createMockFs(
      new Map([
        ["/project/.dust/goals/goal.md", "# Goal\nDescription"],
        ["/project/.dust/tasks/my-task.md", `# Task
## Goals
[Goal](../goals/goal.md)
## Blocked by
## Definition of done`],
      ])
    );
    const glob = createMockGlob([
      "/project/.dust/goals/goal.md",
      "/project/.dust/tasks/my-task.md",
    ]);

    const result = await validate(ctx, fs, [], glob);

    expect(result.exitCode).toBe(0);
    expect(ctx.stdoutLines.join("\n")).toContain("All validations passed");
  });

  test("reports violations", async () => {
    const ctx = createMockContext();
    const fs = createMockFs(
      new Map([
        ["/project/.dust/tasks/my-task.md", "# Task with no headings"],
      ])
    );
    const glob = createMockGlob(["/project/.dust/tasks/my-task.md"]);

    const result = await validate(ctx, fs, [], glob);

    expect(result.exitCode).toBe(1);
    expect(ctx.stderrLines.join("\n")).toContain("violation");
  });
});
