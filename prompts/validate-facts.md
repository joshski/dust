# Validate Facts

Validate that documented facts match the actual implementation.

## Instructions

1. **Read all fact documents** in `.dust/facts/`

2. **For each fact**, verify its claims against the actual codebase:
   - Check that described files and directories exist
   - Verify that documented behavior matches implementation
   - Confirm that listed features are actually implemented
   - Ensure architectural descriptions are accurate

3. **Identify discrepancies**:
   - Facts that describe features not yet implemented
   - Facts that omit recently implemented features
   - Facts with incorrect technical details
   - Facts with broken or outdated links

4. **Report findings** in a structured format:
   - List each fact file reviewed
   - Note whether it is accurate or needs updates
   - For inaccurate facts, describe the specific discrepancies
   - Suggest concrete edits to fix any issues

5. **Do not make changes** unless explicitly asked. This prompt is for validation and reporting only.

## Example Output

```
## Fact Validation Report

### .dust/facts/current-architecture.md
Status: Needs update

Discrepancies:
- Lists "Link validator for checking relative links" as not implemented, but `scripts/validate-links.ts` exists
- Missing reference to prompts directory

Suggested fix:
- Move "Link validator" from "Not Yet Implemented" to "Implemented" section
- Add prompts directory to the directory structure

### .dust/facts/bun-runtime.md
Status: Accurate

No discrepancies found.
```
