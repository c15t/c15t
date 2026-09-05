# @c15t/react

> React consent management docs for c15t, including consent UI, hooks, styling, script loading, and integrations. These docs use umbrella imports; on a direct scoped install substitute @c15t/react for c15t/react, @c15t/core for root c15t imports, and @c15t/nextjs for c15t/next.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Frameworks

Install and configure c15t in JavaScript, React, and Next.js applications.

- [ConsentBanner](./docs/frameworks/react/components/consent-banner.md): Pre-built consent banner shown when consent is required.
- [ConsentManagerProvider](./docs/frameworks/react/components/consent-manager-provider.md): Root provider that initializes the consent manager for your React app.
- [DevTools](./docs/frameworks/react/components/dev-tools.md): A development tool for inspecting consent state, geolocation, loaded scripts, and consent events in real time.
- [Consent Categories](./docs/frameworks/react/concepts/consent-categories.md): How c15t groups cookies and scripts into consent categories.
- [Headless](./docs/frameworks/react/headless.md): Build your own consent UI on top of the c15t hooks.
- [useConsentManager](./docs/frameworks/react/hooks/use-consent-manager/overview.md): Read and update consent state from any component.
- [IAB TCF](./docs/frameworks/react/iab/overview.md): Enable IAB TCF 2.3 in your React app.
- [Quickstart](./docs/frameworks/react/quickstart.md): Add consent management to your React app.
- [Script Loader](./docs/frameworks/react/script-loader.md): Load third-party scripts only after the required consent.
- [Styling](./docs/frameworks/react/styling/overview.md): Theme c15t components with tokens, slots, and class names.
- [Troubleshooting](./docs/frameworks/react/troubleshooting.md): Common problems and fixes for c15t in React.

## Integrations

Connect analytics, advertising, maps, media, and other third-party tools behind consent.

- [Building Integrations](./docs/integrations/building-integrations.md): Write a consent-aware loader for a tool c15t does not ship yet.
- [Google Maps](./docs/integrations/google-maps.md): Render Google Maps embeds only after consent.
- [Google Tag](./docs/integrations/google-tag.md): Load gtag.js for GA4 and Google Ads behind consent.
- [Google Tag Manager](./docs/integrations/google-tag-manager.md): Load GTM with Google Consent Mode v2 defaults.
- [Intercom](./docs/integrations/intercom.md): Load the Intercom messenger behind consent.
- [Meta Pixel](./docs/integrations/meta-pixel.md): Load the Meta Pixel behind consent.
- [Integrations](./docs/integrations/overview.md): Load analytics, pixels, tag managers, and widgets behind consent.

## Reference

Concepts, legal templates, open-source policies, and contributor documentation.

- [Dev Tools](./docs/shared/react/components/dev-tools.md): Reference page for dev tools.
