# Use Flex Layout Instead of Sticky Headers

Replace `position: sticky` headers with a flex column layout. This ensures the scrollbar only appears alongside scrollable content, not over the header.

Currently, detail panel headers use `position: sticky` inside a scrollable container. This means the browser's scrollbar spans the full height of the container including the header area. Switching to a flex layout where the header is outside the scroll container produces cleaner behavior: the header remains fixed at the top of its panel, and the scrollbar only covers the content area below it.

The layout pattern is:

```css
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.header {
  /* fixed in place, no position: sticky needed */
}
.content {
  flex: 1;
  overflow-y: auto; /* scrollbar only here */
}
```

Apply this pattern wherever `position: sticky` is used for headers that should always remain pinned at the top of their panel.

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Detail panel headers no longer use `position: sticky`
- [ ] Headers use a flex column layout where the header is outside the scroll container
- [ ] Scrollbar only appears alongside the content area, not over the header
- [ ] Visual appearance is otherwise unchanged
