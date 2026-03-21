# Changelog

## Breaking Changes

### Docker configuration path changed

The Docker configuration contract is now `.dust/config/container/Dockerfile`.

The legacy path `.dust/Dockerfile` is no longer supported. If you have a Dockerfile at this location, move it to `.dust/config/container/Dockerfile`:

```bash
mkdir -p .dust/config/container
mv .dust/Dockerfile .dust/config/container/Dockerfile
```

Running `dust lint` will report an error if `.dust/Dockerfile` exists.
