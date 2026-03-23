# Remove curl dependency from apiKeyHelper

Use a JS runtime's built-in `fetch` instead of shelling out to `curl` for API proxy token retrieval.

The `apiKeyHelper` in `lib/claude/spawn-claude-code.ts` uses `curl` to fetch tokens from the API proxy:

```
curl -fsS --max-time 2 ${proxyUrl}/token | tr -d '\n'
```

This requires `curl` to be installed in the container image. Since dust is inherently coupled to a JS runtime, we could use `fetch` via whichever runtime is available (`bun`, `node`, etc.) instead, and remove `curl` from `lib/docker/default.Dockerfile`.
