---
'@c15t/astro': minor
'c15t': patch
---

`<IABConsentBanner />` server-renders the IAB TCF banner: the same DOM,
copy and `data-testid`s as the React, Svelte and Vue IAB banners, with no
framework JavaScript. "Customize" opens the TCF preference centre through
the existing island, and the "N partners" link opens it on the vendors
tab, through a new `data-c15t-tab` attribute the shared banner handler
reads.

The server needs a vendor list to render it. Hosted and manifest mode get
one from `/init`; the manifest path now fetches it through a shared
in-process cache in `@c15t/core/server` (`fetchCachedGvl`), so concurrent
renders collapse onto one download rather than one per page. Offline mode
has no backend to ask, so `iab.gvl` takes a list as-is and `iab.gvlURL`
fetches one through the same cache.

An offline policy pack whose model is `iab` was never eligible: local
policy resolution has to know a CMP is configured, and no adapter told it.
`ProviderTransportContext` now carries `iabEnabled` and the React, Svelte
and Astro offline factories forward it, so an offline IAB site resolves
its own policy instead of falling through to the no-banner one.
