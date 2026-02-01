# Decouple `dust loop claude` from git

The `dust loop claude` command currently has git dependencies that could be abstracted away.

Decoupling from git would allow dust to work with other version control systems or even non-VCS workflows.

Related to [VCS Agnostic](../goals/vcs-agnostic.md).
