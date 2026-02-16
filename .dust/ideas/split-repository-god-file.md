# Split repository god file

`lib/bucket/repository.ts` is 477 lines mixing several concerns. It combines git operations, loop orchestration, log buffer management, event formatting, and WebSocket dispatch.

The `runRepositoryLoop` function alone is 130+ lines that builds dependencies, creates custom stdout sinks, wraps run functions, and sets up event callbacks.

Splitting into focused modules would improve clarity:

- `lib/bucket/repository-git.ts` - clone, sync, remove, getRepoPath
- `lib/bucket/repository-loop.ts` - runRepositoryLoop orchestration
- `lib/bucket/repository.ts` - RepositoryState type and parseRepository
