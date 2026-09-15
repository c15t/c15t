---
'c15t': patch
'@c15t/nextjs': patch
'@c15t/react': patch
'@c15t/tanstack-start': patch
'@c15t/ui': patch
---

Render theme CSS in the server HTML to prevent React and Next.js consent banners from flashing default styles before hydration. Preserve the stylesheet and CSP nonce through hydration, and escape theme values so HTML-like strings remain inside the stylesheet.

Apply explicit dark mode and system color preferences before hydration while preserving client-side theme updates.

Reduce the theme generator's initial JavaScript and generated CSS size without changing theme tokens or contrast colors.
