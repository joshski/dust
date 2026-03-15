# Reset git state between worker iterations

The bucket worker does not reset the git working copy between iterations. If Claude errors out or leaves uncommitted changes, that dirty state carries into the next iteration, potentially causing confusing failures.

At the start of each iteration (before `git pull`), the worker should reset the working copy to a clean state — e.g. `git checkout .` and `git clean -fd` — so each task starts from a known-good baseline.

## Open Questions

### Which git commands should be used to reset?

#### git checkout . && git clean -fd

Discards all unstaged changes to tracked files and removes untracked files/directories. Simple and well-understood.

#### git reset --hard HEAD && git clean -fd

Also resets staged changes. More thorough but potentially surprising if something was intentionally staged.

#### git stash

Preserves dirty state for debugging instead of discarding it. More complex but aids post-mortem analysis of failed iterations.
