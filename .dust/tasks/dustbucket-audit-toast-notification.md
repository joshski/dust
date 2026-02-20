# Dustbucket audit toast notification

Show immediate visual feedback when clicking "Add Audit" on dustbucket.com. Display a toast notification and update the button to show a "Task Queued" badge.

## Background

This feature improves the user experience when adding audits through the dustbucket web UI. Currently, the button changes state but doesn't provide clear confirmation that the action succeeded. Users should see:

1. An immediate toast message (e.g., "Audit task created")
2. The button should change to show a "Task Queued" badge

This is a frontend-only change using optimistic UI - the toast and badge appear immediately on button click without waiting for backend confirmation.

## Implementation Notes

This task requires changes to the dustbucket.com web application (separate repository), not the dust CLI. The dust CLI's `dust audit` command already creates task files successfully; no CLI changes are needed.

The web UI should:
- Show the toast notification immediately when the button is clicked
- Update the button state to display "Task Queued" badge
- Handle any API errors gracefully (revert badge, show error toast)

## Principles

- [Fast Feedback Loops](../principles/fast-feedback-loops.md)
- [Unsurprising UX](../principles/unsurprising-ux.md)

## Blocked By

(none)

## Definition of Done

- [ ] Toast notification appears when clicking "Add Audit" on dustbucket.com
- [ ] Button displays "Task Queued" badge immediately after click
- [ ] Error handling shows appropriate feedback if the action fails
