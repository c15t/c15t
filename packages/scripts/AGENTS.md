# @c15t/scripts

> Consent-aware script integration docs for analytics, advertising pixels, tag managers, widgets, and custom loaders.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Frameworks

Install and configure c15t in JavaScript, React, and Next.js applications.

- [Script Loader](./docs/frameworks/next/script-loader.md): Gate third-party scripts behind consent in Next.js — load Google Analytics, Meta Pixel, and other tracking scripts only when users grant permission.
- [Script Loader](./docs/frameworks/react/script-loader.md): Gate third-party scripts behind consent in React — load Google Analytics, Meta Pixel, and other tracking scripts only when users grant permission.

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

- [Script Loader](./docs/shared/react/guides/script-loader.md): Reference page for script loader.

## Other

- [Script loader](./docs/frameworks/javascript/script-loader.md): Attach scripts to current effective permissions.
- [Google Maps](./docs/integrations/google-maps.md): Gate a Google Maps iframe with the Frame component.
- [YouTube](./docs/integrations/youtube.md): Gate a YouTube iframe with the Frame component.
