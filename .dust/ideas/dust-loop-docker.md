# dust loop docker

A variant of `dust loop claude` that runs each iteration in a fresh Docker container.

## Motivation

Running `dust loop docker claude` would launch Claude in a loop where each iteration happens in a new sandbox. This provides:

- **Isolation**: Each iteration starts with a clean environment, preventing state leakage between runs
- **Reproducibility**: Container environments are deterministic and consistent
- **Safety**: Experimental or risky operations are contained and can't affect the host system
- **Parallelization potential**: Multiple containers could run simultaneously on different tasks

## Possible implementation

The command would:

1. Build or pull a Docker image with Claude Code and necessary dependencies
2. Mount the project directory into the container
3. Run the dust loop iteration inside the container
4. Tear down the container after each iteration completes
5. Start a fresh container for the next iteration

## Open questions

- Should the Docker image be configurable or use a standard dust image?
- How should credentials and API keys be passed securely to containers?
- Should there be options to preserve certain state between iterations?
