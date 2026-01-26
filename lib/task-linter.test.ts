import { describe, expect, test } from "vitest";
import {
  validateFilename,
  validateHeadings,
  validateLinks,
  validateTaskFile,
  type FileSystem,
} from "./task-linter";

describe("validateFilename", () => {
  describe("valid slug patterns", () => {
    test("accepts simple lowercase name", () => {
      expect(validateFilename("my-task.md")).toBeNull();
    });

    test("accepts single word", () => {
      expect(validateFilename("task.md")).toBeNull();
    });

    test("accepts multiple hyphens", () => {
      expect(validateFilename("my-long-task-name.md")).toBeNull();
    });

    test("accepts numbers", () => {
      expect(validateFilename("task123.md")).toBeNull();
    });

    test("accepts numbers with hyphens", () => {
      expect(validateFilename("task-v2-update.md")).toBeNull();
    });

    test("accepts path with valid filename", () => {
      expect(validateFilename(".dust/tasks/my-task.md")).toBeNull();
    });
  });

  describe("invalid slug patterns", () => {
    test("rejects uppercase letters", () => {
      const result = validateFilename("MyTask.md");
      expect(result).not.toBeNull();
      expect(result?.message).toContain("does not match slug-style naming");
    });

    test("rejects underscores", () => {
      const result = validateFilename("my_task.md");
      expect(result).not.toBeNull();
      expect(result?.message).toContain("does not match slug-style naming");
    });

    test("rejects spaces", () => {
      const result = validateFilename("my task.md");
      expect(result).not.toBeNull();
      expect(result?.message).toContain("does not match slug-style naming");
    });

    test("rejects starting with hyphen", () => {
      const result = validateFilename("-task.md");
      expect(result).not.toBeNull();
      expect(result?.message).toContain("does not match slug-style naming");
    });

    test("rejects ending with hyphen before extension", () => {
      const result = validateFilename("task-.md");
      expect(result).not.toBeNull();
      expect(result?.message).toContain("does not match slug-style naming");
    });

    test("rejects consecutive hyphens", () => {
      const result = validateFilename("my--task.md");
      expect(result).not.toBeNull();
      expect(result?.message).toContain("does not match slug-style naming");
    });

    test("rejects wrong extension", () => {
      const result = validateFilename("task.txt");
      expect(result).not.toBeNull();
      expect(result?.message).toContain("does not match slug-style naming");
    });

    test("rejects special characters", () => {
      const result = validateFilename("task@name.md");
      expect(result).not.toBeNull();
      expect(result?.message).toContain("does not match slug-style naming");
    });
  });
});

describe("validateHeadings", () => {
  describe("present headings", () => {
    test("returns no violations when all headings present", () => {
      const content = `# My Task

## Goals
- Goal 1

## Blocked by
Nothing

## Definition of done
- Done when tests pass`;

      const result = validateHeadings("task.md", content);
      expect(result).toEqual([]);
    });

    test("accepts headings in any order", () => {
      const content = `# My Task

## Definition of done
- Done

## Goals
- Goal 1

## Blocked by
Nothing`;

      const result = validateHeadings("task.md", content);
      expect(result).toEqual([]);
    });
  });

  describe("missing headings", () => {
    test("reports missing Goals heading", () => {
      const content = `# My Task

## Blocked by
Nothing

## Definition of done
- Done`;

      const result = validateHeadings("task.md", content);
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain("## Goals");
    });

    test("reports missing Blocked by heading", () => {
      const content = `# My Task

## Goals
- Goal 1

## Definition of done
- Done`;

      const result = validateHeadings("task.md", content);
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain("## Blocked by");
    });

    test("reports missing Definition of done heading", () => {
      const content = `# My Task

## Goals
- Goal 1

## Blocked by
Nothing`;

      const result = validateHeadings("task.md", content);
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain("## Definition of done");
    });

    test("reports all missing headings", () => {
      const content = `# My Task

Some content without proper headings.`;

      const result = validateHeadings("task.md", content);
      expect(result).toHaveLength(3);
    });

    test("includes file path in violation", () => {
      const content = "# Task";
      const result = validateHeadings(".dust/tasks/my-task.md", content);
      expect(result[0].file).toBe(".dust/tasks/my-task.md");
    });
  });
});

describe("validateLinks", () => {
  const mockFs = (existingFiles: string[]): FileSystem => ({
    exists: (path: string) => existingFiles.includes(path),
  });

  describe("valid links", () => {
    test("returns no violations for existing relative links", () => {
      const content = `[Goal](../goals/my-goal.md)`;
      const fs = mockFs(["/project/.dust/goals/my-goal.md"]);

      const result = validateLinks("/project/.dust/tasks/task.md", content, fs);
      expect(result).toEqual([]);
    });

    test("skips http links", () => {
      const content = `[External](http://example.com)`;
      const fs = mockFs([]);

      const result = validateLinks("/project/.dust/tasks/task.md", content, fs);
      expect(result).toEqual([]);
    });

    test("skips https links", () => {
      const content = `[External](https://example.com)`;
      const fs = mockFs([]);

      const result = validateLinks("/project/.dust/tasks/task.md", content, fs);
      expect(result).toEqual([]);
    });

    test("skips anchor-only links", () => {
      const content = `[Section](#section)`;
      const fs = mockFs([]);

      const result = validateLinks("/project/.dust/tasks/task.md", content, fs);
      expect(result).toEqual([]);
    });

    test("handles links with anchors to existing files", () => {
      const content = `[Goal Section](../goals/my-goal.md#section)`;
      const fs = mockFs(["/project/.dust/goals/my-goal.md"]);

      const result = validateLinks("/project/.dust/tasks/task.md", content, fs);
      expect(result).toEqual([]);
    });

    test("handles multiple valid links on same line", () => {
      const content = `[Goal 1](../goals/goal1.md) and [Goal 2](../goals/goal2.md)`;
      const fs = mockFs([
        "/project/.dust/goals/goal1.md",
        "/project/.dust/goals/goal2.md",
      ]);

      const result = validateLinks("/project/.dust/tasks/task.md", content, fs);
      expect(result).toEqual([]);
    });
  });

  describe("broken links", () => {
    test("reports broken relative link", () => {
      const content = `[Missing](../goals/nonexistent.md)`;
      const fs = mockFs([]);

      const result = validateLinks("/project/.dust/tasks/task.md", content, fs);
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain("Broken link");
      expect(result[0].message).toContain("nonexistent.md");
    });

    test("includes line number in violation", () => {
      const content = `Line 1
Line 2
[Missing](../goals/nonexistent.md)
Line 4`;
      const fs = mockFs([]);

      const result = validateLinks("/project/.dust/tasks/task.md", content, fs);
      expect(result[0].line).toBe(3);
    });

    test("reports multiple broken links", () => {
      const content = `[Missing 1](../goals/a.md)
[Missing 2](../goals/b.md)`;
      const fs = mockFs([]);

      const result = validateLinks("/project/.dust/tasks/task.md", content, fs);
      expect(result).toHaveLength(2);
    });

    test("reports broken link with anchor", () => {
      const content = `[Missing](../goals/nonexistent.md#section)`;
      const fs = mockFs([]);

      const result = validateLinks("/project/.dust/tasks/task.md", content, fs);
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain("nonexistent.md#section");
    });

    test("includes file path in violation", () => {
      const content = `[Missing](../goals/nonexistent.md)`;
      const fs = mockFs([]);

      const result = validateLinks("/project/.dust/tasks/task.md", content, fs);
      expect(result[0].file).toBe("/project/.dust/tasks/task.md");
    });
  });
});

describe("validateTaskFile", () => {
  const mockFs = (existingFiles: string[]): FileSystem => ({
    exists: (path: string) => existingFiles.includes(path),
  });

  test("returns all violations combined", () => {
    const content = `# Bad Task`;
    const fs = mockFs([]);

    const result = validateTaskFile("BadTask.md", content, fs);
    // Should have filename violation + 3 missing heading violations
    expect(result.length).toBeGreaterThanOrEqual(4);
  });

  test("returns empty array for valid task file", () => {
    const content = `# My Task

## Goals
- [Goal](../goals/goal.md)

## Blocked by
(none)

## Definition of done
- Tests pass`;
    const fs = mockFs(["/project/.dust/goals/goal.md"]);

    const result = validateTaskFile(
      "/project/.dust/tasks/my-task.md",
      content,
      fs
    );
    expect(result).toEqual([]);
  });
});
