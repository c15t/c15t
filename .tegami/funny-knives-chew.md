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

Render theme CSS in the server HTML to prevent React and Next.js consent banners from flashing default styles before hydration. Preserve the stylesheet and CSP nonce through hydration, and escape theme values so HTML-like strings remain inside the stylesheet.

Apply explicit dark mode and system color preferences before hydration while preserving client-side theme updates.

Reduce the theme generator's initial JavaScript and generated CSS size without changing theme tokens or contrast colors.
