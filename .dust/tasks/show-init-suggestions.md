# Show helpful suggestions after `dust init`

After running `dust init`, users should see helpful suggestions for what to do next. This makes it easier for new users to get started without having to read documentation.

The output should end with something like:

```
Commit the changes if you are happy, then get planning!

If this is a new repository, you can start adding ideas or tasks right away:
> claude "Idea: friendly UI for non-technical users"
> claude "Task: set up code coverage"

If this is an existing codebase, you might want to backfill goals and facts:
> claude "Add goals and facts based on the code in this repository"
```

The suggestions should use the detected package runner (npx/bunx/pnpx) for the `claude` command, consistent with how the dust command is detected.

## Goals

- [Easy Adoption](../goals/easy-adoption.md)

## Blocked by

(none)

## Definition of done

- [ ] After `dust init` completes, output helpful suggestions for next steps
- [ ] Suggestions include examples for new repositories (adding ideas/tasks)
- [ ] Suggestions include examples for existing codebases (backfilling goals/facts)
- [ ] The package runner used in examples matches the detected environment (npx/bunx/pnpx)
- [ ] Tests cover the new suggestion output
- [ ] All tests pass
