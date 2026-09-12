# @c15t/browser

> Script-tag consent docs for c15t on Framer, Webflow, WordPress, and plain HTML: the data attributes, the window.c15t API, headless use, styling, manifest mode, and integrations.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Frameworks

Install and configure c15t in JavaScript, React, and Next.js applications.

- [Script Loader](./docs/frameworks/javascript/script-loader.md): Load third-party scripts only after the required consent.
- [Script tag](./docs/frameworks/javascript/script-tag.md): Add a consent banner to Framer, Webflow, WordPress, Squarespace, or any HTML page with one script tag and no build step.

## Integrations

Connect analytics, advertising, maps, media, and other third-party tools behind consent.

- [Building Integrations](./docs/integrations/building-integrations.md): Write a consent-aware loader for a tool c15t does not ship yet.
- [Clear on revocation](./docs/integrations/clear-on-revocation.md): Remove configured first-party cookies and Web Storage keys when their consent category is denied.
- [Google Maps](./docs/integrations/google-maps.md): Render Google Maps embeds only after consent.
- [Google Tag](./docs/integrations/google-tag.md): Load gtag.js for GA4 and Google Ads behind consent.
- [Google Tag Manager](./docs/integrations/google-tag-manager.md): Load GTM with Google Consent Mode v2 defaults.
- [Intercom](./docs/integrations/intercom.md): Load the Intercom messenger behind consent.
- [Meta Pixel](./docs/integrations/meta-pixel.md): Load the Meta Pixel behind consent.
- [Integrations](./docs/integrations/overview.md): Load analytics, pixels, tag managers, and widgets behind consent.
