# Artifact patch preview API

The `buildArtifactPatch` result buries serialized markdown inside `patch.files`, keyed by file paths. A downstream UI can't easily render a preview without parsing paths to determine artifact types and actions.

Add a `previews` array to `BuildArtifactPatchResult` exposing each artifact's type, slug, action (create/update/delete), and markdown content, so UIs can show a diff-like preview before applying a patch.

## Open Questions

### How should update vs create be distinguished?

#### Check the filesystem during patch building

`buildArtifactPatch` already has access to the filesystem. It could check whether each file exists and set the action accordingly.

#### Let the caller specify intent

Add an optional `action` field to each input object so the caller declares whether it's a create or update. Avoids filesystem reads but shifts responsibility to the caller.
