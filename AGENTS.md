# Agent Instructions

This project uses [dust](https://github.com/joshski/dust) (that's this repository!) for planning and documentation.

Run `bun install` if needed. Codex is configured with a project-local `SessionStart` hook that runs `bin/dust codex hook` once per session, which loads the dust agent instructions into the session context.
