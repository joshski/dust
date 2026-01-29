# Git Integration

Tools for integrating Dust with git workflows.

Branch naming that matches task names. Validation that task branches don't already exist before claiming.

Note: Git hooks for enforcing commit conventions have been implemented. The `dust agent` command now automatically installs pre-commit hooks that run `dust check`.
