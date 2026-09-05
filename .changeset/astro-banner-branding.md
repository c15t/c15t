---
'@c15t/astro': patch
---

The Astro banner renders the "Secured by c15t" tag.

`<ConsentBanner />` shipped no branding at all, while the Svelte and React
banners have always rendered one. The tag now uses the same markup,
classes, `data-testid` and `hideBranding` option as they do, so the shared
stylesheet positions it identically and the banner is the same height
across every framework.

Which brand it shows comes from the consent snapshot, as everywhere else.
`<ConsentBanner hideBranding />` turns it off.
