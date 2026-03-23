# Add Apple Container Runtime Support

Add `--apple-container` flag to `dust loop` and `dust bucket worker` as an alternative to `--docker`.

## Background

Apple's [container](https://github.com/apple/container) project runs Linux containers as lightweight VMs on Apple Silicon (macOS 26+). It uses OCI-compatible images, so existing Dockerfiles work without modification. Benefits include no daemon requirement, no licensing concerns, and native Apple Silicon performance.

## Implementation

### CLI flag parsing

1. Add `--apple-container` flag to `lib/loop/parse-args.ts`:
   - Parse `--apple-container` alongside `--docker`
   - Return error if both flags are set (mutually exclusive)
   - Update `LoopArgs` interface to include `appleContainer: boolean`

2. Add same flag to `lib/cli/commands/bucket-worker.ts` `parseBucketWorkerArgs`

### Apple Container runtime

Create `lib/container/apple-container-runtime.ts` implementing the `ContainerRuntime` interface:

1. `isAvailable`: Check for `container` CLI (spawn `container --version`)

2. `buildImage`: Map to `container build -t <tag> -f <dockerfile> <context>`

3. `runCommand`: `'container'`

4. `buildRunArgs`: Map dust options to `container run` arguments:
   - Volume mounts: `--volume <host>:<container>`
   - Environment variables: `--env KEY=VALUE`
   - Working directory: `--workdir <path>`
   - User: `--user <uid>`
   - Remove on exit: `--rm`

### Runtime selection

Update container preparation to select runtime based on CLI flags:

```typescript
function selectRuntime(flags: { docker: boolean; appleContainer: boolean }): ContainerRuntime | null {
  if (flags.docker && flags.appleContainer) {
    return null // error case
  }
  if (flags.appleContainer) {
    return appleContainerRuntime
  }
  if (flags.docker) {
    return dockerRuntime
  }
  return null // no container mode
}
```

### Error messages

- Both flags set: `"Cannot use both --docker and --apple-container. Choose one container runtime."`
- Apple Container not available: `"Apple Container CLI not found. Install from https://github.com/apple/container or use --docker."`

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Unsurprising UX](../principles/unsurprising-ux.md)
- [Actionable Errors](../principles/actionable-errors.md)

## Blocked By

(none)

## Definition of Done

- `--apple-container` flag works for `dust loop` and `dust bucket worker`
- Error when both `--docker` and `--apple-container` are specified
- Apple Container runtime builds and runs containers using the `container` CLI
- Unit tests cover runtime selection and CLI argument mapping
- Integration tested on macOS with Apple Container installed (manual verification)
