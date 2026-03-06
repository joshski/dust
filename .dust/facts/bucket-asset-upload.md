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
2. Tool definitions are stored in `~/.dust/tools.json`
3. The `dust bucket tool` command loads definitions and executes tools generically
4. File validation (size limits, allowed extensions) is now handled server-side

When `DUST_PROXY_PORT` is set (from an active `dust bucket` session), `dust bucket tool ...` sends execution requests to the local proxy (`POST /tools/:name`) instead of calling dustbucket APIs directly. This keeps execution inside the active bucket session and avoids passing bucket credentials to descendant processes.

## Repository Context

This command requires a repository context and must be run within an agent iteration started by `dust bucket`. The `DUST_REPOSITORY_ID` environment variable must be set.

When run outside of a repository context (without `DUST_REPOSITORY_ID`), the command fails with an actionable error message.

## Authentication

The command uses the same authentication infrastructure as `dust bucket`. It tries authentication methods in order:

1. **Environment variable** - `DUST_BUCKET_TOKEN` (if set)
2. **Stored credential** - `~/.dust/credentials.json` (if exists)
3. **Browser auth flow** - Opens browser for OAuth login

On successful browser authentication, the token is stored in `~/.dust/credentials.json` for future use.

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
