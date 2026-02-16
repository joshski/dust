# Sort tasks by file creation time (FIFO)

Tasks in `.dust/tasks/` should be processed in FIFO order based on file creation time, not alphabetically by filename. This ensures that tasks added first are picked up first by `dust bucket` and `dust next`.

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- `getFileCreationTime` added to the `FileSystem` interface
- `birthtimeMs` from `statSync` used in the real implementation
- Task files sorted by creation time in `findUnblockedTasks`
- Test emulator and all inline FileSystem mocks updated
- All tests pass with full coverage
