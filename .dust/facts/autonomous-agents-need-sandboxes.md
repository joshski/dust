# Autonomous Agents Need Sandboxes

Running AI agents autonomously requires a sandboxed environment to prevent unintended system changes.

The [`dust loop`](./loop-command.md) command runs agents continuously. Because agents execute code and modify files, you should run this in an isolated environment:

- **Docker containers** — isolated filesystem and network
- **Virtual machines** — full OS isolation
- **Cloud dev environments** — Codespaces, Gitpod, etc.

Without sandboxing, an agent could accidentally (or through prompt injection) modify files outside the project, install unwanted software, or access sensitive data.
