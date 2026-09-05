# @c15t/react

> React consent management docs for c15t, including consent UI, hooks, styling, script loading, and integrations. These docs use umbrella imports; on a direct scoped install substitute @c15t/react for c15t/react, @c15t/core for root c15t imports, and @c15t/nextjs for c15t/next.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Frameworks

Install and configure c15t in JavaScript, React, and Next.js applications.

- [Callbacks](./docs/frameworks/react/callbacks.md): Observe explicit choices separately from effective permission changes.
- [ConsentBanner](./docs/frameworks/react/components/consent-banner.md): A pre-built consent banner that appears when user consent is needed. Supports policy-aware layout, theming, and advanced composition when markup must change.
- [ConsentDialog](./docs/frameworks/react/components/consent-dialog.md): A modal dialog where users can toggle individual consent categories.
- [ConsentProvider](./docs/frameworks/react/components/consent-manager-provider.md): The root provider component that initializes the consent system and makes consent state available to all child components.
- [DevTools](./docs/frameworks/react/components/dev-tools.md): A development tool for inspecting consent state, geolocation, loaded scripts, and consent events in real time.
- [Frame](./docs/frameworks/react/components/frame.md): A consent-gated content wrapper - children only mount when the required consent category is granted.
- [Consent Categories](./docs/frameworks/react/concepts/consent-categories.md): How c15t organizes tracking technologies into five consent categories.
- [Consent Models](./docs/frameworks/react/concepts/consent-models.md): How c15t determines consent behavior based on legal jurisdiction.
- [Cookie Management](./docs/frameworks/react/concepts/cookie-management.md): How c15t manages cookies through script, iframe, and network gating
- [Initialization Flow](./docs/frameworks/react/concepts/initialization-flow.md): What happens from provider mount to first render — the full consent lifecycle.
- [Policy Packs](./docs/frameworks/react/concepts/policy-packs.md): How c15t resolves regional consent policies and what a policy pack controls.
- [Headless Mode](./docs/frameworks/react/headless.md): Build fully custom consent UI using only hooks - no pre-built components required.
- [useColorScheme](./docs/frameworks/react/hooks/use-color-scheme.md): Manage light/dark mode preferences for consent components.
- [Checking Consent](./docs/frameworks/react/hooks/use-consent-manager/checking-consent.md): Use has() for flexible consent checks with AND, OR, and NOT logic. Read explicit choices separately from effective permissions.
- [Setting Consent](./docs/frameworks/react/hooks/use-consent-manager/setting-consent.md): Edit displayed preference drafts and explicitly confirm their categories.
- [useFocusTrap](./docs/frameworks/react/hooks/use-focus-trap.md): Trap keyboard focus within a container for accessible modal dialogs.
- [useTranslations](./docs/frameworks/react/hooks/use-translations.md): Access the current language's translations for building custom consent UI.
- [IABConsentBanner](./docs/frameworks/react/iab/consent-banner.md): An IAB TCF 2.3 compliant consent banner that displays partner count, purpose summaries, and legitimate interest notices.
- [IABConsentDialog](./docs/frameworks/react/iab/consent-dialog.md): An IAB TCF 2.3 compliant preference center with tabbed purpose and vendor management.
- [IAB TCF 2.3](./docs/frameworks/react/iab/overview.md): Implement IAB Transparency & Consent Framework 2.3 compliance for programmatic advertising in EU/EEA jurisdictions.
- [Internationalization](./docs/frameworks/react/internationalization.md): Translate consent UI into 30+ languages with built-in translations, custom overrides, and automatic browser language detection.
- [Network Blocker](./docs/frameworks/react/network-blocker.md): Block outgoing network requests to third-party domains until the user grants consent for the appropriate category.
- [Optimization](./docs/frameworks/react/optimization.md): Improve c15t startup performance in React with prefetching, proxy rewrites, and rendering tradeoffs.
- [Policy rules and presentation](./docs/frameworks/react/policy-packs.md): Configure policy behavior separately from React layout and preference controls.
- [Quickstart](./docs/frameworks/react/quickstart.md): Add consent management to your React app in under 5 minutes.
- [Script Loader](./docs/frameworks/react/script-loader.md): Gate third-party scripts behind consent in React — load Google Analytics, Meta Pixel, and other tracking scripts only when users grant permission.
- [Color Scheme](./docs/frameworks/react/styling/color-scheme.md): Support light mode, dark mode, and system preference detection in consent components.
- [Styling Overview](./docs/frameworks/react/styling/overview.md): Customize every aspect of c15t's consent components using design tokens, component slots, and CSS variables.
- [Tailwind CSS](./docs/frameworks/react/styling/tailwind.md): Use Tailwind CSS utility classes to style consent components via component slots.

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

- [Building custom consent UI](./docs/frameworks/react/building-headless-components.md): Preserve policy actions and persistent rights in a custom layout.
- [Transport modes](./docs/frameworks/react/concepts/client-modes.md): Select a hosted backend or local rules with a transport factory.
- [useConsentManager](./docs/frameworks/react/hooks/use-consent-manager/overview.md): Read current choices, permissions and editable preferences.
- [Draggable controls](./docs/frameworks/react/hooks/use-draggable.md): Use the built-in dialog trigger for a draggable privacy control.
- [Server state migration](./docs/frameworks/react/hooks/use-ssr-status.md): Use prepared policy and record data for server rendering.
- [Server-side records and policy](./docs/frameworks/react/server-side.md): Prepare canonical records and policy resolution before hydrating React.
- [Troubleshooting](./docs/frameworks/react/troubleshooting.md): Inspect policy, records and permissions when UI or processing differs from expectations.
- [Google Maps](./docs/integrations/google-maps.md): Gate a Google Maps iframe with the Frame component.
- [YouTube](./docs/integrations/youtube.md): Gate a YouTube iframe with the Frame component.
- [Glossary](./docs/shared/concepts/glossary.md): Terms used by the canonical policy and record contract.
- [Upgrade to v3](./docs/upgrade-v3.md): Migrate choices, processing gates, policy rules, presentation and transports to the v3 contract.
