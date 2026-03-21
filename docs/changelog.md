# Changelog

## Breaking Changes

### Docker configuration path changed

The Docker configuration contract is now `.dust/config/container/Dockerfile`.

The legacy path `.dust/Dockerfile` is no longer supported. If you have a Dockerfile at this location, move it to `.dust/config/container/Dockerfile`:

```bash
mkdir -p .dust/config/container
mv .dust/Dockerfile .dust/config/container/Dockerfile
```

`dust lint` reports an error if `.dust/Dockerfile` exists, and agent runtime also exits early with the same migration guidance.

## Improvements

### Docker mode supports Codex runtime

Codex now runs inside Docker when `.dust/config/container/Dockerfile` is present, matching Claude's containerized runtime behavior.
