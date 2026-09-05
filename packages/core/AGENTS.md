# @c15t/core

> Core JavaScript consent management docs for c15t, including client modes, script loading, callbacks, and integrations. These docs use umbrella imports; on a direct scoped install substitute @c15t/core for root c15t imports, @c15t/react for c15t/react, and @c15t/nextjs for c15t/next.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Frameworks

Install and configure c15t in JavaScript, React, and Next.js applications.

- [Consent Categories](./docs/frameworks/javascript/concepts/consent-categories.md): How c15t organizes tracking technologies into five consent categories.
- [Consent Models](./docs/frameworks/javascript/concepts/consent-models.md): How c15t determines consent behavior based on legal jurisdiction.
- [Cookie Management](./docs/frameworks/javascript/concepts/cookie-management.md): How c15t manages cookies through script, iframe, and network gating.
- [Initialization Flow](./docs/frameworks/javascript/concepts/initialization-flow.md): What happens from runtime creation to first state update — the full consent lifecycle.
- [Policy Packs](./docs/frameworks/javascript/concepts/policy-packs.md): How c15t resolves regional consent policies and what a policy pack controls.
- [DevTools](./docs/frameworks/javascript/dev-tools.md): Inspect a JavaScript consent kernel with the imperative DevTools API.
- [IAB TCF 2.3](./docs/frameworks/javascript/iab/overview.md): Use confirmed IAB TCF 2.3 authority for programmatic advertising gates.
- [Optimization](./docs/frameworks/javascript/optimization.md): Improve c15t startup performance with prefetching and network tuning.

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

## Reference

Concepts, legal templates, open-source policies, and contributor documentation.

- [Client Modes](./docs/shared/concepts/client-modes.md): Reference page for client modes.
- [Consent Categories](./docs/shared/concepts/consent-categories.md): Reference page for consent categories.
- [Consent Models](./docs/shared/concepts/consent-models.md): Reference page for consent models.
- [Cookie Management](./docs/shared/concepts/cookie-management.md): Reference page for cookie management.
- [Initialization Flow](./docs/shared/concepts/initialization-flow.md): Reference page for initialization flow.
- [Policy Packs](./docs/shared/concepts/policy-packs.md): Reference page for policy packs.
- [Consent Banner](./docs/shared/react/components/consent-banner.md): Reference page for consent banner.
- [Consent Dialog](./docs/shared/react/components/consent-dialog.md): Reference page for consent dialog.
- [Consent Dialog Trigger](./docs/shared/react/components/consent-dialog-trigger.md): Reference page for consent dialog trigger.
- [Consent Manager Provider](./docs/shared/react/components/consent-manager-provider.md): Reference page for consent manager provider.
- [Consent Widget](./docs/shared/react/components/consent-widget.md): Reference page for consent widget.
- [Dev Tools](./docs/shared/react/components/dev-tools.md): Reference page for dev tools.
- [Frame](./docs/shared/react/components/frame.md): Reference page for frame.
- [Building Headless Components](./docs/shared/react/guides/building-headless-components.md): Reference page for building headless components.
- [Callbacks](./docs/shared/react/guides/callbacks.md): Reference page for callbacks.
- [Headless](./docs/shared/react/guides/headless.md): Reference page for headless.
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
- [Use Focus Trap](./docs/shared/react/hooks/use-focus-trap.md): Reference page for use focus trap.
- [Use SSR Status](./docs/shared/react/hooks/use-ssr-status.md): Reference page for use ssr status.
- [Use Translations](./docs/shared/react/hooks/use-translations.md): Reference page for use translations.
- [Consent Banner](./docs/shared/react/iab/consent-banner.md): Reference page for consent banner.
- [Consent Dialog](./docs/shared/react/iab/consent-dialog.md): Reference page for consent dialog.
- [Overview](./docs/shared/react/iab/overview.md): Reference page for overview.
- [Classnames](./docs/shared/react/styling/classnames.md): Reference page for classnames.
- [Color Scheme](./docs/shared/react/styling/color-scheme.md): Reference page for color scheme.
- [CSS Variables](./docs/shared/react/styling/css-variables.md): Reference page for css variables.
- [Overview](./docs/shared/react/styling/overview.md): Reference page for overview.
- [Slots](./docs/shared/react/styling/slots.md): Reference page for component slots.
- [Stylesheet Entrypoint](./docs/shared/react/styling/stylesheet-entrypoint.md): Reference page for stylesheet entrypoint.
- [Tailwind](./docs/shared/react/styling/tailwind.md): Reference page for tailwind.
- [Troubleshooting](./docs/shared/troubleshooting.md): Reference page for troubleshooting.

## Other

- [Checking permissions](./docs/frameworks/javascript/api/checking-consent.md): Use the core evaluator for processing decisions.
- [Location and identity](./docs/frameworks/javascript/api/location-info.md): Read resolved geography and identify an existing consent subject.
- [Kernel API](./docs/frameworks/javascript/api/overview.md): Read snapshots, subscribe to events and record explicit choices.
- [Recording choices](./docs/frameworks/javascript/api/setting-consent.md): Confirm only categories supplied by a direct user action.
- [Building consent UI](./docs/frameworks/javascript/building-ui.md): Render policy interactions while keeping processing gates independent.
- [Kernel events](./docs/frameworks/javascript/callbacks.md): Observe explicit choices independently of permission changes.
- [Transport modes](./docs/frameworks/javascript/concepts/client-modes.md): Choose a transport separately from browser persistence.
- [Iframe blocking](./docs/frameworks/javascript/iframe-blocking.md): Keep iframe URLs inactive until their category permits processing.
- [Internationalization](./docs/frameworks/javascript/internationalization.md): Read resolved translations without changing policy or choice records.
- [Network blocker](./docs/frameworks/javascript/network-blocker.md): Apply effective permissions to configured fetch and XMLHttpRequest targets.
- [Policy rules](./docs/frameworks/javascript/policy-packs.md): Resolve local rules or fetch the versioned backend policy contract.
- [JavaScript quickstart](./docs/frameworks/javascript/quickstart.md): Create a consent kernel and attach browser persistence.
- [Script loader](./docs/frameworks/javascript/script-loader.md): Attach scripts to current effective permissions.
- [Troubleshooting](./docs/frameworks/javascript/troubleshooting.md): Inspect policy resolution and permissions when an integration stays blocked.
- [Google Maps](./docs/integrations/google-maps.md): Gate a Google Maps iframe with the Frame component.
- [YouTube](./docs/integrations/youtube.md): Gate a YouTube iframe with the Frame component.
- [Glossary](./docs/shared/concepts/glossary.md): Terms used by the canonical policy and record contract.
- [Upgrade to v3](./docs/upgrade-v3.md): Migrate choices, processing gates, policy rules, presentation and transports to the v3 contract.
