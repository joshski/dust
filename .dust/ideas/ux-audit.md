# UX Audit

Add a stock audit that instructs agents to review the end user experience by capturing visual or interactive evidence at key scenarios.

## Context

The existing audit suite covers code quality, test coverage, security, and developer experience. A UX audit complements these by focusing on what users actually see and experience when interacting with the application.

The approach varies by application type:

- **Web applications**: Use browser automation to take screenshots at every stage of key scenarios. Tools like Playwright, Puppeteer, or Cypress can capture screenshots automatically.
- **Terminal applications**: Capture terminal output during interactions, potentially using record/replay mechanisms. The dust codebase already has a VCR pattern (`lib/claude/vcr.ts`) for recording and replaying Claude Code interactions, which could inform a similar approach for terminal UX.
- **Hybrid applications**: May need a combination of both approaches.

The audit should produce artifacts that agents can analyze to identify UX issues: confusing states, missing feedback, error messages that don't help users recover, layout problems, accessibility gaps, and inconsistent styling.

## Proposed Audit Structure

```
# UX Audit

Review the end user experience by capturing visual or interactive evidence at key scenarios.

## Scope

1. **Identify key scenarios** - What are the main user journeys? (e.g., signup, login, checkout, onboarding)
2. **Capture evidence** - For each scenario:
   - Web apps: Take screenshots at each step using browser automation
   - Terminal apps: Capture command output and interactive sessions
3. **Review captured evidence** for UX issues:
   - Confusing or unclear states
   - Missing feedback or loading indicators
   - Error messages that don't guide recovery
   - Inconsistent styling or layout
   - Accessibility problems
4. **Document findings** with screenshots/output and specific recommendations

## Applicability

Determine the application type and available tooling:
- If browser tests exist (Playwright, Puppeteer, Cypress), add screenshot capture to existing tests
- If no browser tests exist, write a standalone script for key scenarios
- For terminal apps, capture representative sessions using script recording or terminal emulation

If the project has no user-facing interface, document that finding and skip the detailed analysis.

## Output

For each UX issue identified, provide:
- **Location** - Which scenario and step
- **Evidence** - Screenshot or captured output
- **Problem** - What's wrong from the user's perspective
- **Impact** - How it affects the user's ability to complete their goal
- **Recommendation** - Specific fix

## Definition of Done

- [ ] Identified the application type (web, terminal, hybrid, or no UI)
- [ ] Listed key user scenarios
- [ ] Captured screenshots or output at each stage of key scenarios
- [ ] Reviewed evidence for UX issues
- [ ] Documented findings with evidence and recommendations
- [ ] Created ideas for any UX improvements needed
```

## Relationship to Existing Audits

| Audit | Focus | Relationship |
|-------|-------|--------------|
| agent-developer-experience | Agent usability | Complementary - this focuses on end user experience |
| test-coverage | Code paths | Complementary - this focuses on what users see, not code coverage |
| error-handling | Error patterns | Overlapping - error messages are part of UX |

## Implementation Notes

### Web Application Screenshot Capture

For projects using Playwright:
```typescript
// Add to existing test or create new script
await page.screenshot({ path: `screenshots/step-1-landing.png` });
// Navigate to login
await page.screenshot({ path: `screenshots/step-2-login-form.png` });
// Submit login
await page.screenshot({ path: `screenshots/step-3-dashboard.png` });
```

For projects without existing browser automation, the audit should guide agents to set up minimal screenshot scripts rather than full browser test suites.

### Terminal Application Capture

For terminal apps, options include:
- Using the existing VCR pattern to record command outputs
- Running commands with captured stdout/stderr
- Using `script` command for full terminal session recording

The dust codebase could serve as an example: capture `dust next`, `dust agent`, and `dust check` output to verify the CLI provides clear feedback.

## Alignment with Principles

- **[Actionable Errors](../principles/actionable-errors.md)** - Error messages should tell users what to do next
- **[Unsurprising UX](../principles/unsurprising-ux.md)** - The interface should be guessable
- **[Agent Developer Experience](../principles/ideal-agent-developer-experience.md)** - While focused on agents, the principles of fast feedback and clear context apply to users too

## Open Questions

### How should captured artifacts be stored?

#### Option: Temporary files reviewed during audit

Capture screenshots or output to a temporary directory. The agent reviews them during the audit and documents findings in the audit output. Artifacts are discarded after the audit completes.

Pros: No repository clutter, artifacts stay ephemeral
Cons: Cannot review historical captures, no visual diff capability

#### Option: Committed to repository

Store screenshots in a designated directory (e.g., `.dust/screenshots/` or `docs/screenshots/`). This enables visual diff comparisons across commits.

Pros: Historical comparison, can catch visual regressions
Cons: Repository bloat, binary files in git

#### Option: External storage

Upload screenshots to an external service or bucket. Reference by URL in audit output.

Pros: No repository bloat, shareable artifacts
Cons: Requires external service setup, may not persist

### What tools should the audit recommend?

#### Option: Be prescriptive

Recommend specific tools based on project type: Playwright for web, `script` command for terminal. Provides clear guidance.

Pros: Actionable, reduces agent decision-making
Cons: May not fit all projects, tooling preferences vary

#### Option: Be flexible

List options and let the agent choose based on what's already in the project. If Cypress is already installed, use that; if nothing exists, suggest the simplest option.

Pros: Adapts to existing tooling, less opinionated
Cons: More agent decisions, inconsistent approaches

#### Option: Detect and recommend

Have the audit detect existing tooling (check for playwright.config, cypress.config, etc.) and recommend extending it. Only suggest new tooling if nothing exists.

Pros: Leverages existing investment, minimal new dependencies
Cons: Detection logic adds complexity

### How should accessibility be handled?

#### Option: Separate audit

Keep this UX audit focused on visual/interaction review. Create a separate accessibility audit using tools like axe-core or pa11y.

Pros: Focused scope, specialized tooling for a11y
Cons: Two audits to run, may miss context

#### Option: Include basic accessibility checks

Include basic accessibility review (color contrast, alt text, keyboard navigation) as part of the UX audit, but don't require specialized tooling.

Pros: Holistic UX view, no additional audit needed
Cons: May not catch all a11y issues

#### Option: Conditionally include

If accessibility tooling is detected, include a11y checks in the UX audit. Otherwise, focus on visual/interaction review and suggest an accessibility audit as a follow-up.

Pros: Adapts to project capabilities, doesn't overwhelm
Cons: Inconsistent scope

### Should the audit verify that issues are fixed?

#### Option: Document expected fix verification

When documenting a UX issue, include how to verify it's fixed (e.g., "Screenshot at step 3 should show success message instead of spinner").

Pros: Clear acceptance criteria, enables regression testing
Cons: More work during audit, may be speculative

#### Option: Create follow-up task with verification

When an issue is found, create a task that includes re-running the UX capture to verify the fix.

Pros: Structured verification workflow, task-based
Cons: More artifacts, may create many tasks

#### Option: Leave verification implicit

Just document the issue. Assume fixing and verification happen through normal development workflow.

Pros: Simpler audit, less overhead
Cons: No structured way to confirm fixes
