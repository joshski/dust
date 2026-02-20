# Bucket Asset Upload

The `dust bucket asset upload` command uploads a file to the dustbucket server and outputs the public URL.

## Usage

```bash
dust bucket asset upload <file-path>
```

On success, the command outputs the public URL of the uploaded asset.

## Authentication

The command uses the same authentication infrastructure as `dust bucket`. It tries authentication methods in order:

1. **Environment variable** - `DUST_BUCKET_TOKEN` (if set)
2. **Stored credential** - `~/.dust/credentials.json` (if exists)
3. **Browser auth flow** - Opens browser for OAuth login

On successful browser authentication, the token is stored in `~/.dust/credentials.json` for future use.

## File Constraints

**Maximum file size:** 10 MB

**Allowed file extensions:**
- Images: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`
- Documents: `.pdf`, `.txt`, `.json`, `.csv`, `.md`, `.html`, `.xml`

## Server API Contract

The command makes a `POST` request to `{DUST_BUCKET_HOST}/api/assets` (defaults to `https://dustbucket.com/api/assets`).

**Request:**
- Method: `POST`
- Headers:
  - `Authorization: Bearer <token>`
  - `Content-Type: <mime-type>` (derived from file extension)
- Body: Raw file bytes

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
