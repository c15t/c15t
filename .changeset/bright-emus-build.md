---
'@c15t/ui': patch
'@c15t/react': patch
'@c15t/nextjs': patch
---

Fix consent switch sizing so it renders consistently in Tailwind and non-Tailwind apps.

- `@c15t/ui`: make the shared switch primitive use an explicit `border-box` layout, size its track independently of host box-model resets, and clip the track so the thumb ring does not bleed past the edge.
- `@c15t/react`: publish the updated prebuilt consent UI styling so React consumers pick up the normalized switch sizing.
- `@c15t/nextjs`: publish the updated stylesheet bridge so Next.js installs pick up the normalized switch sizing as well.
