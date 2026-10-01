---
packages:
  '@c15t/core': patch
---

### Gate iframes after a client router replaces the page body

The iframe blocker now watches the document root instead of the `<body>` it saw at startup. Astro's `ClientRouter` and Turbo replace `<body>` on navigation, so gated iframes on a page reached by client-side navigation used to keep their `data-src` after consent was granted, and kept loading their `src` after it was denied, until the next consent change. The blocker also now starts watching when it runs from a script in `<head>`, before `<body>` exists.
