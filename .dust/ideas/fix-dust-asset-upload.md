# Fix dust asset upload

Running `dust asset upload` from a Bash tool within a `dust bucket` session fails because `DUST_REPOSITORY_ID` is not set.

## Context

The error message shown is:

```
Error: DUST_REPOSITORY_ID environment variable is not set.
This command must be run within a repository context (via `dust bucket`).
```

The `DUST_REPOSITORY_ID` environment variable flows through the system as follows:

1. **Server sends repository list**: The dustbucket server sends a `repository-list` WebSocket message containing repository objects. Each repository object can include an `id` field.

2. **Client parses repository**: In `lib/bucket/repository.ts:138-172`, `parseRepository` extracts the `id` field if it's a string:
   ```typescript
   if (typeof repositoryData.id === 'string') {
     repo.id = repositoryData.id
   }
   ```

3. **Repository loop passes ID**: In `lib/bucket/repository-loop.ts:261`, the repository ID is passed to `runOneIteration`:
   ```typescript
   repositoryId: repoState.repository.id,
   ```

4. **Loop sets environment variable**: In `lib/cli/commands/loop.ts:303-304`:
   ```typescript
   if (repositoryId) {
     baseEnv.DUST_REPOSITORY_ID = repositoryId
   }
   ```

5. **Claude receives environment**: In `lib/claude/spawn-claude-code.ts:63`, the environment is passed to the Claude process:
   ```typescript
   env: { ...process.env, ...env }
   ```

6. **Bash tool should inherit**: When Claude runs a Bash tool, the environment should be inherited by child processes.

7. **Asset upload checks**: In `lib/cli/commands/bucket-asset-upload.ts:198-205`, the command checks for the environment variable and fails if not set.

### Possible root causes

**1. Server not sending repository ID**

The dustbucket server might not be including the `id` field in the repository list message. If `repository.id` is `undefined`, the `DUST_REPOSITORY_ID` environment variable is never set (step 4 above).

**2. Claude Code not propagating environment to Bash**

Claude Code receives the environment variables when spawned, but might not pass them through to Bash subprocesses. This would be a Claude Code behavior issue.

**3. Wrong field name**

The server might be sending the ID under a different field name than `id` (e.g., `repositoryId` or `_id`).

## Open Questions

### Where is the failure occurring?

#### Option: Server not sending ID

The dustbucket server's `repository-list` message doesn't include an `id` field for repositories. This would require a server-side fix to include the repository ID.

#### Option: Client parsing issue

The client correctly receives the ID from the server but fails to parse it. This could happen if the server sends the ID as a non-string type (e.g., number or object).

#### Option: Claude Code environment propagation

Claude Code receives the `DUST_REPOSITORY_ID` environment variable but doesn't propagate it to Bash subprocesses. This would be a Claude Code bug.

### How should we investigate this?

#### Option: Add debug logging

Add temporary logging in `repository.ts:parseRepository` to log the raw data received from the server and the parsed repository object. This would reveal whether the ID is missing from the server or failing to parse.

#### Option: Add integration test

Create an integration test that mocks the dustbucket server sending a repository list with an `id` field, runs a task that invokes `dust asset upload`, and verifies the environment variable is correctly propagated.

#### Option: Check dustbucket server code

Review the dustbucket server implementation to verify whether it's sending the `id` field in repository list messages.
