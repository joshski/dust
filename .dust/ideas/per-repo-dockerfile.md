# Per-repo Dockerfile

Allow each repository to define its own Dockerfile that specifies the environment where dust agents run.

## Motivation

Different repositories have different build requirements:

- **Language runtimes**: Some projects need Node.js 18, others need Python 3.11, others need Go 1.22
- **System dependencies**: Some projects require native libraries (imagemagick, ffmpeg, etc.)
- **Build tools**: Some need specific versions of compilers, linters, or bundlers
- **Pre-installed packages**: Some repos benefit from having dependencies pre-installed in the image

A per-repo Dockerfile lets each project define its ideal agent environment without requiring a one-size-fits-all base image.

## Relationship to other ideas

This complements **dust-loop-docker.md** which focuses on running iterations in containers. That idea asks "should the Docker image be configurable or use a standard dust image?" - this idea answers that question by defining how per-repo customization works.

This is simpler than the original docker-compose concept. Docker-compose was designed for service dependencies (databases, message queues, caches). If a repo needs those, it can either:

1. Include `docker compose` commands in its setup instructions for the agent
2. Use a future service-orchestration feature (see original idea scope below)

## Possible implementation

1. On `dust loop` or `dust bucket` startup, check if `.dust/Dockerfile` exists in the repository
2. If present, build the image (or use a cached build) with a deterministic tag (e.g., `dust-<repo-hash>`)
3. Mount the repository into the container and run the agent iteration inside it
4. The Dockerfile can extend a base dust image or start from scratch

Example `.dust/Dockerfile`:
```dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y git
# Agent will be mounted and run here
```

## Open Questions

### Where should the Dockerfile live?

#### .dust/Dockerfile

Keeps dust-specific configuration in the `.dust/` directory. Clear separation from the project's own Dockerfile (if any).

#### Dockerfile.dust in root

More discoverable, follows common naming patterns like `Dockerfile.dev`. May conflict with existing Dockerfiles.

### Should there be a fallback base image?

#### Yes, use a maintained dust base image

If no `.dust/Dockerfile` exists, use a standard `dust/agent` image with common tools pre-installed. Ensures basic functionality out of the box.

#### No, require explicit Dockerfile

Force each repo to define its environment explicitly. More work upfront but no hidden dependencies.

---

## Descoped: Service Dependencies

The original idea included docker-compose for service dependencies (databases, caches, etc.). This has been descoped from this proposal. If service orchestration is needed in the future, it warrants a separate idea that addresses:

- Compose file detection and lifecycle management
- Port conflict resolution across repos
- Service startup/shutdown timing
- Health checks before iteration starts
