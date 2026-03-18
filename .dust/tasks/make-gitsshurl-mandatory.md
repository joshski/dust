# Make gitSshUrl Mandatory

Make `gitSshUrl` a required field in the bucket protocol and all related interfaces.

## Background

When listing repositories from the bucket server, `gitSshUrl` is currently optional while `gitUrl` (HTTPS) is required. The clone process uses a fallback strategy: try HTTPS first, then SSH if available. Making `gitSshUrl` mandatory ensures the SSH fallback is always available, improving clone reliability.

## Implementation

### Functional core changes

1. Update `Repository` interface in `lib/bucket/repository.ts`:
   - Change `gitSshUrl?: string` to `gitSshUrl: string`

2. Update `parseRepository` in `lib/bucket/repository.ts`:
   - Add validation for `typeof repositoryData.gitSshUrl === 'string'`
   - Return `null` if `gitSshUrl` is missing (invalid repository)

3. Update `cloneRepository` parameter type in `lib/bucket/repository-git.ts`:
   - Change `gitSshUrl?: string` to `gitSshUrl: string`

### Imperative shell changes

1. Update bucket protocol documentation in `.dust/facts/bucket-protocol.md`:
   - Change `gitSshUrl?: string` to `gitSshUrl: string` in `RepositoryListItem`
   - Update required fields list to include `gitSshUrl`

### Test updates

Update any test fixtures that create `Repository` objects to include `gitSshUrl`.

## Blocked By

(none)

## Principles

- [Batteries Included](../principles/batteries-included.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)

## Definition of Done

- `gitSshUrl` is required in `Repository` interface
- `parseRepository` rejects repositories without `gitSshUrl`
- Protocol documentation reflects the mandatory field
- All tests pass with `gitSshUrl` included
- `bin/dust check` passes
