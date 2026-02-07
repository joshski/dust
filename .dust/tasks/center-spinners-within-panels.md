# Center Spinners Within Panels

Center loading spinners both vertically and horizontally within their containing panel.

Currently, when a panel shows a loading spinner (e.g. the detail panel on the right side of the sessions view), the spinner is positioned near the top of the panel rather than being truly centered. It should be centered both vertically and horizontally within the available space of the panel it belongs to.

The fix is to ensure the spinner's parent container uses centering layout, for example:

```css
.spinner-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
```

Apply this to every panel where a spinner can appear, so the spinner is always visually centered regardless of panel size.

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Spinners are vertically and horizontally centered within their containing panel
- [ ] Fix applies to all panels where spinners can appear (e.g. detail panel, list panel)
- [ ] No layout shift or overflow issues introduced by the centering
