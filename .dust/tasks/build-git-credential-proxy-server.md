# Build Git Credential Proxy Server

Create an HTTP server that runs on the host and proxies git requests from Docker containers. The container talks plain HTTP to the proxy, and the proxy forwards to the upstream HTTPS URL with credentials injected.

The proxy uses the host's existing git credential system (`git credential fill`) so no new auth setup is required from the user.

Flow:
```
Container: git clone http://host.docker.internal:<port>/org/repo.git
    → Proxy receives plain HTTP git smart protocol request
    → Proxy runs `git credential fill` on host to get credentials
    → Proxy forwards as https://github.com/org/repo.git with Authorization header
    → Returns response to container
```

Must handle git smart HTTP protocol endpoints: `info/refs`, `git-upload-pack`, `git-receive-pack`.

## Blocked By

(none)

## Definition of Done

- [ ] HTTP server that accepts git smart HTTP protocol requests
- [ ] Extracts target host/org/repo from request URL
- [ ] Runs `git credential fill` on host to obtain credentials
- [ ] Forwards request to upstream HTTPS URL with `Authorization` header
- [ ] Returns upstream response to the container
- [ ] Tests covering the proxy logic
