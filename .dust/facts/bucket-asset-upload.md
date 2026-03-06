# Bucket Asset Upload

Asset upload is now a server-defined tool executed via `dust bucket tool asset-upload`.

## Usage

```bash
dust bucket tool asset-upload <file-path>
```

On success, the command outputs the public URL of the uploaded asset.

## How It Works

Asset upload is implemented as a server-defined tool rather than a hardcoded command:

1. The server sends tool definitions via WebSocket when `dust bucket` connects
2. The local bucket proxy exposes the active in-memory definitions at `GET /tools`
3. The `dust bucket tool` command loads definitions from the proxy and executes tools generically via proxy
4. File validation (size limits, allowed extensions) is now handled server-side

`dust bucket tool ...` requires `DUST_PROXY_PORT` from an active `dust bucket` session. It reads tool definitions from `GET /tools` and sends execution requests to `POST /tools/:name`. This keeps execution inside the active bucket session and avoids passing bucket credentials to descendant processes.

## Repository Context

This command requires a repository context and must be run within an agent iteration started by `dust bucket`. The `DUST_REPOSITORY_ID` environment variable must be set.

When run outside of a repository context (without `DUST_REPOSITORY_ID`), the command fails with an actionable error message.

## Authentication

Authentication is handled by the active `dust bucket` session behind the local proxy. `dust bucket tool` does not read credentials directly.

## Server API Contract

The tool executor makes requests to the endpoint specified in the tool definition. For asset-upload, this is typically `POST /api/assets?repositoryId=<id>`.

**Request:**
- Method: `POST` (as defined in tool definition)
- Query parameters:
  - `repositoryId`: The repository ID from `DUST_REPOSITORY_ID` environment variable
- Headers:
  - `Authorization: Bearer <token>`
- Body: `multipart/form-data` with file parameter

**Response (success):**
```json
{
  "url": "https://dustbucket.com/assets/<asset-id>"
}
```

**Response (error):**
- HTTP status code indicates failure
- Response body contains error message

## Configuration

Set `DUST_BUCKET_HOST` environment variable to use a custom server (e.g., for self-hosted instances).
