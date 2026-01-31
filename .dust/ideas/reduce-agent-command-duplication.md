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

Could be consolidated with a factory function in `agent-shared.ts`:

```typescript
export const createAgentCommand = (templateName: string) =>
  async (dependencies: CommandDependencies): Promise<CommandResult> => {
    const { context, settings } = dependencies
    const hooksInstalled = await manageGitHooks(dependencies)
    const vars = templateVariables(settings, hooksInstalled)
    context.stdout(loadTemplate(templateName, vars))
    return { exitCode: 0 }
  }
```

Then each command file becomes trivial or could be eliminated entirely.
