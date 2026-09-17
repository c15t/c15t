---
'@c15t/react-native': minor
---

Draw the `Secured by c15t` tab. Web hangs it above the banner card and below the dialog card, and the package had nothing there. It is a real link to `c15t.com` with `role="link"` and the name `Secured by c15t`, so a reader hears the same sentence as on web rather than an unlabelled image, and it opens through `Linking` rather than a browser-only anchor. A host takes it out with `hideBranding`, which is what the web `hide` parameter does, and it stays off no surface by default.

React Native ships no SVG renderer, so the glyph is the web's own path rasterised at build time and committed as a module of base64 `data:` URIs at 15, 30 and 45px, picked by `PixelRatio.get()`. A data URI needs no Metro asset plugin in the host app, no build-time copy step, and no entry in the published `files` list, so a missing asset is not a way to ship a blank badge. `scripts/generate-branding-mark.ts` regenerates it from `packages/browser`; it is an explicit script, never part of a build, and it refuses to write anything when no browser is installed.

The tab sits outside the card it attaches to, because both cards clip their corners and a clipped tab is a cut-off one. `ConsentSurface` gains a `branding` slot for it. It shares the card's radius on the two corners that face it, gives up the border on the edge they meet, and carries the web `min-height: 1.75rem`, 10/4.5 padding, and an 11px label at `line-height: 1`. `ConsentThemeColors` gains `primaryBorder`, which is the web `color-mix(in srgb, primary, black 14%)` resolved per scheme, since React Native has no colour function to run at render. `CONSENT_THEME_PARTS` gains `branding` and `brandingLabel`, and the lead-in comes from `common.securedBy` as `ConsentCopy.securedBy` falls back to English. The brand itself is the mark and wordmark, not a string a translation gets to change.

The native snapshot carries no `branding` field yet, so the tab always names c15t. `inth` would need both that field and a second raster.
