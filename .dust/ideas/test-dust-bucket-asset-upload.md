# Test `dust bucket asset upload`

Validate that asset upload works end-to-end with a real dustbucket server connection.

## Context

The `dust bucket asset upload` command uploads files to a dustbucket server and returns a public URL. The implementation exists at `lib/cli/commands/bucket-asset-upload.ts` with comprehensive unit tests in `lib/cli/commands/bucket-asset-upload.test.ts`.

### Current Test Coverage

Unit tests cover:
- File validation (extension, size, existence)
- MIME type detection
- Authentication flow (environment token, stored credentials, browser auth)
- Upload request formation
- Error handling

However, all tests use mock dependencies (`createMockUploadDeps`) that stub the actual HTTP upload. No tests validate:
- Real server responses
- Actual file upload and retrieval
- URL accessibility after upload
- Server-side validation behavior

### Dependencies

The command requires:
- `DUST_REPOSITORY_ID` environment variable (set by `dust bucket` when running agent iterations)
- Authentication token (via `DUST_BUCKET_TOKEN` env var, stored credentials, or browser flow)
- A running dustbucket server connection

### Constraints

- Max file size: 10 MB
- Allowed extensions: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`, `.pdf`, `.txt`, `.json`, `.csv`, `.md`, `.html`, `.xml`

## Open Questions

### How should we test against a real server?

#### Option: Integration test with dustbucket.com

Run a test that actually uploads to dustbucket.com using real credentials. Would require:
- CI secrets for `DUST_BUCKET_TOKEN`
- A test repository ID
- Cleanup mechanism for uploaded test assets

Pros: Tests the actual production path. Catches API contract changes.
Cons: Adds external dependency to CI. May incur costs. Requires credential management.

#### Option: Local mock server

Create a minimal HTTP server that implements the dustbucket API contract (POST `/api/assets?repositoryId=<id>` returning `{url: "..."}`). Run as part of the test suite.

Pros: Fast, hermetic, no external dependencies.
Cons: May drift from real server behavior. Doesn't validate actual dustbucket integration.

#### Option: Manual exploratory testing

Document a procedure for manual testing with a real dustbucket connection. Test before releases.

Pros: Simple to implement. Tests full stack.
Cons: Not automated. Easy to skip or forget.

### What file types should the test upload?

#### Option: Test one representative file type

Upload a small PNG or text file to verify the upload/download cycle.

Pros: Minimal test surface. Fast.
Cons: May miss MIME type handling bugs for other formats.

#### Option: Test each allowed file category

Upload at least one image, one document, and one text-based format (e.g., PNG, PDF, JSON).

Pros: Better coverage of MIME type handling.
Cons: Slower tests. More test data to maintain.

### Should we verify uploaded content is retrievable?

#### Option: Upload and immediately fetch

After uploading, make a GET request to the returned URL and verify content matches.

Pros: Full round-trip validation.
Cons: Adds complexity. May have timing issues with CDN propagation.

#### Option: Trust the URL response

If the server returns a URL, assume it works. The server's responsibility to ensure correctness.

Pros: Simpler tests. Faster execution.
Cons: May miss integration issues where URLs are returned but content is inaccessible.
