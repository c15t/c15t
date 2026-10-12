---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
---

### Gate iframes after a client router replaces the page body

The iframe blocker watches the document root instead of the `<body>` it saw
at startup. Before, after Astro's `ClientRouter` or Turbo replaced `<body>`,
gated iframes on the new page ignored consent until the next consent change.
The blocker also starts watching when it runs from a script in `<head>`.
