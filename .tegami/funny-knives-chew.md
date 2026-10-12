---
packages:
  c15t:
    replay:
      - exit-prerelease(c15t)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(@c15t/nextjs)
  "@c15t/react":
    replay:
      - exit-prerelease(@c15t/react)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(@c15t/tanstack-start)
  "@c15t/ui":
    replay:
      - exit-prerelease(@c15t/ui)
---

### Render theme styles before hydration

React and Next.js render theme CSS in the server HTML, so consent banners no
longer flash default styles before hydration. The stylesheet keeps its CSP
nonce through hydration, and theme values are escaped so HTML-like strings
stay inside the stylesheet. Explicit dark mode and system color preferences
also apply before hydration.

The theme generator ships less JavaScript and CSS, with the same tokens and
contrast colors.
