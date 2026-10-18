---
packages:
  '@c15t/react': patch
---

### `ConsentBanner` loads its code only when a banner may show

The banner's components now load as their own chunk, like `ConsentDialog`.
`ConsentBanner` loads it when the banner shows, or when no choice is stored
and the policy is still resolving. A visitor whose earlier choice still stands
no longer downloads the banner: in a Next.js app with the banner, dialog and
trigger, that cuts the first load by about 11 KB of compressed JavaScript.

When the server renders the banner, its HTML stays on the page until the
chunk arrives, and taps on its buttons before then still count. Composed layouts built from `ConsentBanner.<Part>` load the
chunk whenever they render.
