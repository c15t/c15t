# @c15t/core

> Core JavaScript consent management docs for c15t, including client modes, script loading, callbacks, and integrations. These docs use umbrella imports; on a direct scoped install substitute @c15t/core for root c15t imports, @c15t/react for c15t/react, and @c15t/nextjs for c15t/next.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Frameworks

Install and configure c15t in JavaScript, React, and Next.js applications.

- [Checking Consent](./docs/frameworks/javascript/api/checking-consent.md): Read consent state from the store — check individual categories, logical conditions, and the full consent object.
- [Location & Identity](./docs/frameworks/javascript/api/location-info.md): Access detected location, override geolocation, change language, and link user identity.
- [Store API Overview](./docs/frameworks/javascript/api/overview.md): Core API entry points for JavaScript consent management — runtime creation, store access, and subscription patterns.
- [Setting Consent](./docs/frameworks/javascript/api/setting-consent.md): Save, stage, and reset consent preferences using the store API.
- [Building UI](./docs/frameworks/javascript/building-ui.md): Build your own consent UI on top of the headless c15t store — with vanilla DOM, any framework, or the @c15t/ui theme system.
- [Callbacks](./docs/frameworks/javascript/callbacks.md): React to consent lifecycle events — initialization, consent changes, errors, and revocation reloads.
- [Client Modes](./docs/frameworks/javascript/concepts/client-modes.md): Choose how c15t connects to its backend — full hosted integration, offline-only, or bring your own backend.
- [Consent Categories](./docs/frameworks/javascript/concepts/consent-categories.md): How c15t organizes tracking technologies into five consent categories.
- [Consent Models](./docs/frameworks/javascript/concepts/consent-models.md): How c15t determines consent behavior based on legal jurisdiction.
- [Cookie Management](./docs/frameworks/javascript/concepts/cookie-management.md): How c15t manages cookies through script, iframe, and network gating.
- [Glossary](./docs/frameworks/javascript/concepts/glossary.md): Key terms used throughout the c15t documentation.
- [Initialization Flow](./docs/frameworks/javascript/concepts/initialization-flow.md): What happens from runtime creation to first state update — the full consent lifecycle.
- [Policy Packs](./docs/frameworks/javascript/concepts/policy-packs.md): How c15t resolves regional consent policies and what a policy pack controls.
- [IAB TCF 2.3](./docs/frameworks/javascript/iab/overview.md): Implement IAB Transparency & Consent Framework 2.3 compliance for programmatic advertising in EU/EEA jurisdictions.
- [Iframe Blocking](./docs/frameworks/javascript/iframe-blocking.md): Block embedded content (YouTube, social widgets, maps) until users grant consent for the appropriate category.
- [Internationalization](./docs/frameworks/javascript/internationalization.md): Translate consent UI into 30+ languages with built-in translations, custom overrides, and automatic browser language detection.
- [Network Blocker](./docs/frameworks/javascript/network-blocker.md): Block outgoing network requests to third-party domains until the user grants consent for the appropriate category.
- [Optimization](./docs/frameworks/javascript/optimization.md): Improve c15t startup performance with prefetching and network tuning.
- [Policy Packs](./docs/frameworks/javascript/policy-packs.md): Configure regional consent policies in the headless JavaScript runtime — hosted mode, presets, and offline fallback.
- [Quickstart](./docs/frameworks/javascript/quickstart.md): Get started with c15t in vanilla JavaScript — framework-agnostic consent management with no UI dependencies.
- [Script Loader](./docs/frameworks/javascript/script-loader.md): Gate third-party scripts behind consent — load Google Analytics, Meta Pixel, and other tracking scripts only when users grant permission.
- [Troubleshooting](./docs/frameworks/javascript/troubleshooting.md): Solutions for common issues with c15t in JavaScript — store access, missing banners, consent persistence, and more.

## Integrations

Connect analytics, advertising, maps, media, and other third-party tools behind consent.

- [Adobe Analytics](./docs/integrations/adobe-analytics.md): Adobe Analytics loaded through an Adobe Experience Platform Data Collection Tags embed URL.
- [Ahrefs Analytics](./docs/integrations/ahrefs-analytics.md): Cookieless web analytics from Ahrefs with a prebuilt helper that wires the project key into a c15t-managed script.
- [Amplitude](./docs/integrations/amplitude.md): Load Amplitude Browser SDK 2 with c15t and gate product analytics behind measurement consent.
- [Build a Custom Script Integration](./docs/integrations/building-integrations.md): Learn when to use a raw Script, when to build a reusable manifest-backed integration, and how to debug and test custom consent-aware scripts in c15t.
- [Clearbit](./docs/integrations/clearbit.md): Visitor and company enrichment loaded with Clearbit's account-keyed tags.js snippet.
- [Cloudflare Web Analytics](./docs/integrations/cloudflare-web-analytics.md): Cookieless analytics from Cloudflare with a prebuilt helper that serializes the beacon config into the `data-cf-beacon` attribute.
- [Crisp](./docs/integrations/crisp.md): Load Crisp live chat with website ID, runtime, cookie, and session options.
- [Databuddy](./docs/integrations/databuddy.md): Databuddy is a privacy-focused analytics platform that helps you understand user behavior and track events. It supports cookieless tracking and manages consent automatically through c15t's consent state synchronization.
- [Fathom Analytics](./docs/integrations/fathom-analytics.md): Privacy-friendly cookieless analytics with a prebuilt helper that maps Fathom's data attributes into a c15t-managed script.
- [Google Maps](./docs/integrations/google-maps.md): Render Google Maps only after consent with one shared Maps JavaScript API loader and independently managed map instances.
- [GA4 + Google Ads (gtag.js)](./docs/integrations/google-tag.md): Send data to Google Analytics 4 and Google Ads with automatic Consent Mode v2 support.
- [Google Tag Manager](./docs/integrations/google-tag-manager.md): Deploy and manage marketing tags centrally with automatic consent state synchronization.
- [Heap](./docs/integrations/heap.md): Load Heap with c15t and gate autocapture product analytics behind measurement consent.
- [Hightouch](./docs/integrations/hightouch.md): Load Hightouch Events with c15t and gate the browser SDK behind measurement consent.
- [Hotjar](./docs/integrations/hotjar.md): Product analytics and behavior insights with a prebuilt helper that seeds Hotjar globals before loading the vendor bundle.
- [Intercom](./docs/integrations/intercom.md): Bootstrap Intercom settings and load the messenger widget bundle.
- [LinkedIn Insights](./docs/integrations/linkedin-insights.md): Track conversions and build matched audiences for LinkedIn advertising campaigns.
- [LogRocket](./docs/integrations/logrocket.md): Session replay and monitoring loaded after measurement consent with LogRocket's browser SDK.
- [Matomo Analytics](./docs/integrations/matomo-analytics.md): Load Matomo with c15t and keep Matomo's queue aligned with measurement consent.
- [Meta Pixel](./docs/integrations/meta-pixel.md): Track conversions and build audiences for Facebook and Instagram advertising campaigns.
- [Microsoft Clarity](./docs/integrations/microsoft-clarity.md): Session replay and behavior analytics with a prebuilt helper that keeps Clarity consent synchronized with c15t measurement state.
- [Microsoft UET](./docs/integrations/microsoft-uet.md): Track conversions and measure performance for Microsoft Advertising and Bing Ads.
- [Mixpanel Analytics](./docs/integrations/mixpanel-analytics.md): Load Mixpanel with c15t and let Mixpanel's own opt-in and opt-out APIs follow measurement consent.
- [Integrations](./docs/integrations/overview.md): Load analytics, pixels, tag managers, and widgets through c15t so consent state controls when they run, update, and appear in your consent UI.
- [Pirsch](./docs/integrations/pirsch.md): Privacy-friendly, cookieless analytics loaded with Pirsch's fixed script id and identification-code attributes.
- [Plausible Analytics](./docs/integrations/plausible-analytics.md): Privacy-friendly cookieless analytics with a prebuilt helper that preserves Plausible's queue bootstrap and loader attributes.
- [PostHog](./docs/integrations/posthog.md): PostHog is an open-source product analytics platform for tracking user behavior, session replays, feature flags, and A/B testing. It supports cookieless tracking, allowing analytics to continue even without cookie consent.
- [Promptwatch](./docs/integrations/promptwatch.md): Promptwatch analyzes traffic on your site for Artificial Intelligence (AI) traffic and usage insights. Data is stored in the EU without user-identifiable information.
- [Reddit Pixel](./docs/integrations/reddit-pixel.md): Track conversions and build retargeting audiences for Reddit advertising campaigns.
- [RudderStack](./docs/integrations/rudderstack.md): Load RudderStack's JavaScript SDK with c15t and gate the browser SDK behind measurement consent.
- [Rybbit Analytics](./docs/integrations/rybbit-analytics.md): Privacy-friendly analytics with script-tag configuration via Rybbit's data attributes.
- [Segment](./docs/integrations/segment.md): Load Segment Analytics.js with c15t and gate it behind measurement consent.
- [Snapchat Pixel](./docs/integrations/snapchat-pixel.md): Measure Snapchat ad performance and build remarketing audiences with a prebuilt pixel helper.
- [TikTok Pixel](./docs/integrations/tiktok-pixel.md): Measure ad performance and build audiences for TikTok advertising campaigns.
- [Umami Analytics](./docs/integrations/umami-analytics.md): Open-source, cookieless analytics with a prebuilt helper that maps Umami's data attributes into a c15t-managed script.
- [Vercel Analytics](./docs/integrations/vercel-analytics.md): Bootstrap Vercel Analytics with a declarative queue and script attributes.
- [X Pixel (Twitter Pixel)](./docs/integrations/x-pixel.md): Track conversions and build audiences for advertising campaigns on X (formerly Twitter).
- [YouTube](./docs/integrations/youtube.md): Keep YouTube iframes unmounted until consent with a privacy-enhanced, lazy-loaded React or Next.js embed.

## Reference

Concepts, legal templates, open-source policies, and contributor documentation.

- [Client Modes](./docs/shared/concepts/client-modes.md): Reference page for client modes.
- [Consent Categories](./docs/shared/concepts/consent-categories.md): Reference page for consent categories.
- [Consent Models](./docs/shared/concepts/consent-models.md): Reference page for consent models.
- [Cookie Management](./docs/shared/concepts/cookie-management.md): Reference page for cookie management.
- [Glossary](./docs/shared/concepts/glossary.md): Reference page for glossary.
- [Initialization Flow](./docs/shared/concepts/initialization-flow.md): Reference page for initialization flow.
- [Policy Packs](./docs/shared/concepts/policy-packs.md): Reference page for policy packs.
- [Consent Banner](./docs/shared/react/components/consent-banner.md): Reference page for consent banner.
- [Consent Dialog](./docs/shared/react/components/consent-dialog.md): Reference page for consent dialog.
- [Consent Dialog Link](./docs/shared/react/components/consent-dialog-link.md): Reference page for consent dialog link.
- [Consent Dialog Trigger](./docs/shared/react/components/consent-dialog-trigger.md): Reference page for consent dialog trigger.
- [Consent Manager Provider](./docs/shared/react/components/consent-manager-provider.md): Reference page for consent manager provider.
- [Consent Widget](./docs/shared/react/components/consent-widget.md): Reference page for consent widget.
- [Dev Tools](./docs/shared/react/components/dev-tools.md): Reference page for dev tools.
- [Frame](./docs/shared/react/components/frame.md): Reference page for frame.
- [Building Headless Components](./docs/shared/react/guides/building-headless-components.md): Reference page for building headless components.
- [Callbacks](./docs/shared/react/guides/callbacks.md): Reference page for callbacks.
- [Headless](./docs/shared/react/guides/headless.md): Reference page for headless.
- [Iframe Blocking](./docs/shared/react/guides/iframe-blocking.md): Reference page for iframe blocking.
- [Internationalization](./docs/shared/react/guides/internationalization.md): Reference page for internationalization.
- [Network Blocker](./docs/shared/react/guides/network-blocker.md): Reference page for network blocker.
- [Optimization](./docs/shared/react/guides/optimization.md): Reference page for optimization.
- [Policy Packs](./docs/shared/react/guides/policy-packs.md): Reference page for policy packs.
- [Script Loader](./docs/shared/react/guides/script-loader.md): Reference page for script loader.
- [Use Color Scheme](./docs/shared/react/hooks/use-color-scheme.md): Reference page for use color scheme.
- [Checking Consent](./docs/shared/react/hooks/use-consent-manager/checking-consent.md): Reference page for checking consent.
- [Location Info](./docs/shared/react/hooks/use-consent-manager/location-info.md): Reference page for location info.
- [Overview](./docs/shared/react/hooks/use-consent-manager/overview.md): Reference page for overview.
- [Setting Consent](./docs/shared/react/hooks/use-consent-manager/setting-consent.md): Reference page for setting consent.
- [Use Draggable](./docs/shared/react/hooks/use-draggable.md): Reference page for use draggable.
- [Use Focus Trap](./docs/shared/react/hooks/use-focus-trap.md): Reference page for use focus trap.
- [Use Reduced Motion](./docs/shared/react/hooks/use-reduced-motion.md): Reference page for use reduced motion.
- [Use SSR Status](./docs/shared/react/hooks/use-ssr-status.md): Reference page for use ssr status.
- [Use Text Direction](./docs/shared/react/hooks/use-text-direction.md): Reference page for use text direction.
- [Use Translations](./docs/shared/react/hooks/use-translations.md): Reference page for use translations.
- [Consent Banner](./docs/shared/react/iab/consent-banner.md): Reference page for consent banner.
- [Consent Dialog](./docs/shared/react/iab/consent-dialog.md): Reference page for consent dialog.
- [Overview](./docs/shared/react/iab/overview.md): Reference page for overview.
- [Use GVL Data](./docs/shared/react/iab/use-gvl-data.md): Reference page for use gvl data.
- [Classnames](./docs/shared/react/styling/classnames.md): Reference page for classnames.
- [Color Scheme](./docs/shared/react/styling/color-scheme.md): Reference page for color scheme.
- [CSS Variables](./docs/shared/react/styling/css-variables.md): Reference page for css variables.
- [Overview](./docs/shared/react/styling/overview.md): Reference page for overview.
- [Slots](./docs/shared/react/styling/slots.md): Reference page for component slots.
- [Stylesheet Entrypoint](./docs/shared/react/styling/stylesheet-entrypoint.md): Reference page for stylesheet entrypoint.
- [Tailwind](./docs/shared/react/styling/tailwind.md): Reference page for tailwind.
- [Tokens](./docs/shared/react/styling/tokens.md): Reference page for tokens.
- [Troubleshooting](./docs/shared/troubleshooting.md): Reference page for troubleshooting.
