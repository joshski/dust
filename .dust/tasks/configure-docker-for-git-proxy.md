# Configure Docker Containers to Use Git Proxy

Modify `buildDockerRunArguments()` in `lib/claude/spawn-claude-code.ts` to stop mounting host credentials and instead route git traffic through the git credential proxy.

Changes:
- Stop mounting `~/.ssh` into the container
- Stop mounting `~/.gitconfig` into the container
- Configure git inside the container to rewrite URLs to use the proxy (e.g. `url.http://host.docker.internal:<port>/.insteadOf` rules for known hosts)
- Pass the proxy URL as an environment variable

The container should be able to `git clone`, `git push`, `git pull` transparently without any credentials present.

## Blocked By

- [Build Git Credential Proxy Server](build-git-credential-proxy.md)

## Definition of Done

- [ ] `~/.ssh` is no longer mounted into Docker containers
- [ ] `~/.gitconfig` is no longer mounted into Docker containers
- [ ] Git operations inside the container route through the host proxy
- [ ] `git clone`, `push`, and `pull` work transparently from within the container
- [ ] Tests covering the updated Docker argument building
