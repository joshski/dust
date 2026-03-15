# Audit: UX Audit

Review the end user experience by capturing visual or interactive evidence at key scenarios.

Review existing ideas in `./.dust/ideas/` to understand what has been proposed or considered historically, then create new idea files in `./.dust/ideas/` for any issues you identify, avoiding duplication.

## Scope

1. **Identify key scenarios** - What are the main user journeys? (e.g., signup, login, checkout, onboarding, core workflows)
2. **Capture evidence** - For each scenario:
   - Web apps: Take screenshots at each step using browser automation (Playwright, Puppeteer, Cypress, or similar)
   - Terminal apps: Capture command output and interactive sessions
3. **Review captured evidence** for UX issues:
   - Confusing or unclear states
   - Missing feedback or loading indicators
   - Error messages that don't guide recovery
   - Inconsistent styling or layout
4. **Document findings** with screenshots/output and specific recommendations

## Applicability

Determine the application type and available tooling:
- If browser tests exist (Playwright, Puppeteer, Cypress), extend them to capture screenshots
- If no browser tests exist, write a standalone script for key scenarios
- For terminal apps, capture representative sessions using command output or terminal recording

If the project has no user-facing interface, document that finding and skip the detailed analysis.

## Analysis Steps

1. Identify the application type (web, terminal, hybrid, no UI)
2. List the key user scenarios from documentation, tests, or code analysis
3. Capture screenshots or output at each stage of each scenario
4. Store artifacts in a temporary directory for review during this audit
5. Review each artifact for UX issues
6. Document findings with evidence and specific recommendations

## Output

For each UX issue identified, provide:
- **Location** - Which scenario and step
- **Evidence** - Screenshot filename or captured output
- **Problem** - What's wrong from the user's perspective
- **Impact** - How it affects the user's ability to complete their goal
- **Recommendation** - Specific fix
- **Verification** - How to verify the fix (e.g., "Screenshot at step 3 should show success message instead of spinner")

## Principles

- [Actionable Errors](../principles/actionable-errors.md) - Error messages should tell users what to do next
- [Unsurprising UX](../principles/unsurprising-ux.md) - The interface should be as guessable as possible

## Blocked By

(none)

## Definition of Done

- [ ] Identified the application type (web, terminal, hybrid, or no UI)
- [ ] Listed key user scenarios
- [ ] Captured screenshots or output at each stage of key scenarios
- [ ] Reviewed evidence for UX issues
- [ ] Documented findings with evidence and recommendations
- [ ] Included verification criteria for each issue
- [ ] Created ideas for any UX improvements needed