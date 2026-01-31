# Reduce agent command duplication

All 7 agent command files under `lib/cli/commands/agent-*.ts` have nearly identical implementations. The only difference is the template name passed to `loadTemplate`.

Current pattern (repeated 7 times):

```typescript
export async function agentXxx(dependencies: CommandDependencies): Promise<CommandResult> {
  const { context, settings } = dependencies
  const hooksInstalled = await manageGitHooks(dependencies)
  const vars = templateVariables(settings, hooksInstalled)
  context.stdout(loadTemplate('agent-xxx', vars))
  return { exitCode: 0 }
}
```

Consolidate with a factory function in `template-command.ts`:

```typescript
export const createTemplateCommand = (templateName: string) =>
  async (dependencies: CommandDependencies): Promise<CommandResult> => {
    const { context, settings } = dependencies
    const hooksInstalled = await manageGitHooks(dependencies)
    const vars = templateVariables(settings, hooksInstalled)
    context.stdout(loadTemplate(templateName, vars))
    return { exitCode: 0 }
  }
```

Then each command file becomes trivial or could be eliminated entirely.

## Goals

(none)

## Blocked by

(none)

## Definition of done

- [ ] Factory function `createTemplateCommand` exists in `template-command.ts`
- [ ] All agent command files use the factory function
- [ ] Tests pass
- [ ] No code duplication across agent command files
