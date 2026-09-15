---
'@c15t/react': patch
'@c15t/astro': patch
'@c15t/vue': patch
---

Remove first-open scheduling delays from React's aggregate dialog, widget, and compound components while preserving server rendering and hydration. Keep children mounted when an external runtime provides IAB context, so loading the bridge cannot reset local drafts.

Remove the extra Suspense delay from Astro's React IAB dialog island. Preload Vue and Nuxt preference dialogs when their banner's Customize button or preference link receives hover or keyboard focus.
