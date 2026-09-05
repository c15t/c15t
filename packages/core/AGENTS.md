# @c15t/core

> Core JavaScript consent management docs for c15t, including client modes, script loading, callbacks, and integrations. These docs use umbrella imports; on a direct scoped install substitute @c15t/core for root c15t imports, @c15t/react for c15t/react, and @c15t/nextjs for c15t/next.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Frameworks

Install and configure c15t in JavaScript, React, and Next.js applications.

- [Store API](./docs/frameworks/javascript/api/overview.md): The consent store API for reading and setting consent.
- [Building Framework Libraries](./docs/frameworks/javascript/building-ui.md): Build a framework adapter on top of the core consent store.
- [Consent Categories](./docs/frameworks/javascript/concepts/consent-categories.md): How c15t groups cookies and scripts into consent categories.
- [DevTools](./docs/frameworks/javascript/dev-tools.md): Inspect a JavaScript consent kernel with the imperative DevTools API.
- [IAB TCF](./docs/frameworks/javascript/iab/overview.md): Enable IAB TCF 2.3 with the core store.
- [Quickstart](./docs/frameworks/javascript/quickstart.md): Add consent management to a vanilla JavaScript app.
- [Script Loader](./docs/frameworks/javascript/script-loader.md): Load third-party scripts only after the required consent.
- [Troubleshooting](./docs/frameworks/javascript/troubleshooting.md): Common problems and fixes for c15t in JavaScript.

## Integrations

Connect analytics, advertising, maps, media, and other third-party tools behind consent.

- [Building Integrations](./docs/integrations/building-integrations.md): Write a consent-aware loader for a tool c15t does not ship yet.
- [Google Maps](./docs/integrations/google-maps.md): Render Google Maps embeds only after consent.
- [Google Tag](./docs/integrations/google-tag.md): Load gtag.js for GA4 and Google Ads behind consent.
- [Google Tag Manager](./docs/integrations/google-tag-manager.md): Load GTM with Google Consent Mode v2 defaults.
- [Intercom](./docs/integrations/intercom.md): Load the Intercom messenger behind consent.
- [Meta Pixel](./docs/integrations/meta-pixel.md): Load the Meta Pixel behind consent.
- [Integrations](./docs/integrations/overview.md): Load analytics, pixels, tag managers, and widgets behind consent.
