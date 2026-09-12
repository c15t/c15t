# @c15t/nextjs

> Next.js v3 App Router, Pages Router, static export and hydration with Inth.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Using these docs

These docs describe v3. Start with Inth hosted setup, identify the framework, router and deployment, then read its quickstart. Static sites can use Inth directly. Use page Markdown and package-bundled docs for targeted context. Verify scripts, rejection, reload and preferences; banner visibility alone is insufficient.

## Start here

- [Next.js quickstart](./docs/frameworks/next/quickstart.md)
- [App Router setup](./docs/frameworks/next/app-router.md)
- [Pages Router setup](./docs/frameworks/next/pages-router.md)
- [Static export setup](./docs/frameworks/next/static-export.md)
- [Customize your consent interface](./docs/customization/overview.md): Choose presentation, theme tokens, slots or custom markup for the change you need.
- [Verify consent before shipping](./docs/guides/verify-consent.md): Test requests, policy resolution, persistence, navigation and preference changes in a production build.
- [Upgrade to v3 policies](./docs/upgrade-v3.md): Migrate policy configuration, consent records, callbacks, and custom transports to the v3 policy system.

## More documentation

[Documentation index](https://c15t.com/docs/llms.txt) · [Full Markdown context](https://c15t.com/llms-full.txt). Prefer the index and individual pages for focused tasks.

## Frameworks

- [Fetching reference](./docs/frameworks/next/api-reference/data-fetching.md): Reference for Next.js consent URLs, manifest resolution, request geography and offline configuration.
- [App Router](./docs/frameworks/next/app-router.md): Set up App Router with Inth, cached manifests and consent-gated scripts.
- [Client-side initialization](./docs/frameworks/next/client-side.md): Initialize Next.js consent in the browser with one backend URL, without server prefetch or local API handlers.
- [ConsentBanner](./docs/frameworks/next/components/consent-banner.md): Pre-built consent banner shown when consent is required.
- [ConsentDialogTrigger](./docs/frameworks/next/components/consent-dialog-trigger.md): Floating button and toolbar that reopen the preference center after the first prompt.
- [ConsentBoundary](./docs/frameworks/next/components/consent-manager-provider.md): Pass server-prefetched consent and shared configuration to the Next.js consent boundary.
- [DevTools](./docs/frameworks/next/components/dev-tools.md): A development tool for inspecting consent state, geolocation, loaded scripts, and consent events in real time.
- [Consent categories](./docs/frameworks/next/concepts/consent-categories.md): Assign optional features to categories and understand how policy scope affects permission.
- [Policy presets](./docs/frameworks/next/concepts/policy-presets.md): Understand how policy rules affect Next.js prompts, permissions and persistent privacy controls.
- [Data fetching](./docs/frameworks/next/data-fetching.md): Choose cached manifests for a Next.js server, backend initialization for a simpler setup, or offline mode for local development.
- [Headless](./docs/frameworks/next/headless.md): Build your own consent UI on top of the c15t hooks.
- [Hooks](./docs/frameworks/next/hooks/use-consent-manager/overview.md): Choose focused consent hooks for feature gates, explicit choices and preference actions.
- [IAB TCF](./docs/frameworks/next/iab/overview.md): Configure the IAB provider, policy and vendor data before rendering the TCF interface.
- [Optimization](./docs/frameworks/next/optimization.md): Reuse cached policy data and optionally reduce browser connection overhead without changing consent behavior.
- [Pages Router](./docs/frameworks/next/pages-router.md): Set up Pages Router with Inth, cached manifests and consent-gated scripts.
- [Quickstart](./docs/frameworks/next/quickstart.md): Add c15t to Next.js with Inth. Choose your router or static export below.
- [Load scripts with consent](./docs/frameworks/next/script-loader.md): Register vendor scripts in your existing Next.js consent boundary and handle loading and revocation.
- [Server rendering and hydration](./docs/frameworks/next/server-side.md): Resolve consent on the server, choose what waits for the result, and preserve the same state through hydration.
- [Static export](./docs/frameworks/next/static-export.md): Add c15t to output export without request helpers or a local API server.
- [Styling](./docs/frameworks/next/styling/overview.md): Theme c15t components with tokens, slots, and class names.
- [Troubleshoot Next.js consent](./docs/frameworks/next/troubleshooting.md): Diagnose failed Next.js prefetch, verify manifest requests, and fix consent rendering or persistence problems.

## Guides

- [Understand consent state](./docs/guides/consent-state.md): Distinguish policy resolution, effective permissions, explicit choices, notices and privacy signals.
- [Data fetching and transports](./docs/guides/data-fetching.md): Choose cached manifests, backend init or offline policy resolution, and understand where consent records are saved.
- [Choose a deployment mode](./docs/guides/deployment-modes.md): Choose who runs your consent backend, then select manifest, init or offline resolution for your deployment.
- [Troubleshoot consent](./docs/guides/troubleshooting.md): Diagnose missing banners, early vendor requests, lost choices and hydration differences.
- [Verify consent before shipping](./docs/guides/verify-consent.md): Test requests, policy resolution, persistence, navigation and preference changes in a production build.

## Customization

- [Customize your consent interface](./docs/customization/overview.md): Choose presentation, theme tokens, slots or custom markup for the change you need.
- [Banner styling recipes](./docs/customization/recipes.md): See real v3 components and reuse the exact theme configuration behind the examples.
- [Style component slots](./docs/customization/slots.md): Target a specific c15t component part without replacing its markup or behavior.
- [Theme tokens and CSS](./docs/customization/tokens.md): Style c15t with semantic tokens and use the stylesheet that matches your CSS tooling.
- [Copy and translations](./docs/customization/translations.md): Change consent wording through i18n and test the complete prompt and preferences flow.

## Integrations

- [Adobe Analytics](./docs/integrations/adobe-analytics.md): Configure Adobe Analytics with c15t v3, understand measurement permission and verify loading and revocation.
- [Ahrefs Analytics](./docs/integrations/ahrefs-analytics.md): Configure Ahrefs Analytics with c15t v3, understand measurement permission and verify loading and revocation.
- [Amplitude](./docs/integrations/amplitude.md): Configure Amplitude with c15t v3, understand measurement permission and verify loading and revocation.
- [Custom integrations](./docs/integrations/building-integrations.md): Define loading, initialization and consent-change behavior for a vendor without a helper.
- [Clearbit](./docs/integrations/clearbit.md): Configure Clearbit with c15t v3, understand marketing permission and verify loading and revocation.
- [Cloudflare Web Analytics](./docs/integrations/cloudflare-web-analytics.md): Configure Cloudflare Web Analytics with c15t v3, understand measurement permission and verify loading and revocation.
- [Crisp](./docs/integrations/crisp.md): Configure Crisp with c15t v3, understand functionality permission and verify loading and revocation.
- [Databuddy](./docs/integrations/databuddy.md): Configure Databuddy's initial and updated consent state with c15t v3.
- [Fathom Analytics](./docs/integrations/fathom-analytics.md): Configure Fathom Analytics with c15t v3, understand measurement permission and verify loading and revocation.
- [Google Maps](./docs/integrations/google-maps.md): Prevent a map iframe from mounting before the required permission.
- [Google Tag](./docs/integrations/google-tag.md): Configure gtag with c15t Consent Mode signals and understand its loading behavior.
- [Google Tag Manager](./docs/integrations/google-tag-manager.md): Load GTM with c15t consent signals and verify the tags inside your container.
- [Heap](./docs/integrations/heap.md): Configure Heap with c15t v3, understand measurement permission and verify loading and revocation.
- [Hightouch](./docs/integrations/hightouch.md): Configure Hightouch with c15t v3, understand measurement permission and verify loading and revocation.
- [Hotjar](./docs/integrations/hotjar.md): Configure Hotjar with c15t v3, understand measurement permission and verify loading and revocation.
- [Intercom](./docs/integrations/intercom.md): Load the Intercom messenger with functionality permission and configure its region.
- [LinkedIn Insight Tag](./docs/integrations/linkedin-insights.md): Configure LinkedIn Insight Tag with c15t v3, understand marketing permission and verify loading and revocation.
- [LogRocket](./docs/integrations/logrocket.md): Configure LogRocket with c15t v3, understand measurement permission and verify loading and revocation.
- [Matomo Analytics](./docs/integrations/matomo-analytics.md): Choose gated loading or Matomo consent signaling and configure the correct tracker endpoints.
- [Meta Pixel](./docs/integrations/meta-pixel.md): Register the Meta Pixel under marketing permission and verify event calls after revocation.
- [Microsoft Clarity](./docs/integrations/microsoft-clarity.md): Configure Microsoft Clarity with c15t v3, understand measurement permission and verify loading and revocation.
- [Microsoft UET](./docs/integrations/microsoft-uet.md): Configure Microsoft UET with c15t v3, understand marketing permission and verify loading and revocation.
- [Mixpanel](./docs/integrations/mixpanel-analytics.md): Configure Mixpanel with c15t v3, understand measurement permission and verify loading and revocation.
- [Overview](./docs/integrations/overview.md): Find all c15t integrations for analytics, tag managers, advertising, chat and embedded content.
- [Pirsch](./docs/integrations/pirsch.md): Configure Pirsch with c15t v3, understand measurement permission and verify loading and revocation.
- [Plausible Analytics](./docs/integrations/plausible-analytics.md): Configure Plausible Analytics with c15t v3, understand measurement permission and verify loading and revocation.
- [PostHog](./docs/integrations/posthog.md): Choose PostHog loading and cookieless behavior, configure the region, and synchronize v3 permissions.
- [Promptwatch](./docs/integrations/promptwatch.md): Configure Promptwatch with c15t v3, understand measurement permission and verify loading and revocation.
- [Reddit Pixel](./docs/integrations/reddit-pixel.md): Configure Reddit Pixel with c15t v3, understand marketing permission and verify loading and revocation.
- [RudderStack](./docs/integrations/rudderstack.md): Gate the RudderStack browser SDK or map c15t categories to destination consent IDs.
- [Rybbit Analytics](./docs/integrations/rybbit-analytics.md): Configure Rybbit Analytics with c15t v3, understand measurement permission and verify loading and revocation.
- [Segment](./docs/integrations/segment.md): Configure Segment with c15t v3, understand measurement permission and verify loading and revocation.
- [Snapchat Pixel](./docs/integrations/snapchat-pixel.md): Configure Snapchat Pixel with c15t v3, understand marketing permission and verify loading and revocation.
- [TikTok Pixel](./docs/integrations/tiktok-pixel.md): Configure TikTok Pixel with c15t v3, understand marketing permission and verify loading and revocation.
- [Umami Analytics](./docs/integrations/umami-analytics.md): Configure Umami Analytics with c15t v3, understand measurement permission and verify loading and revocation.
- [Vercel Analytics](./docs/integrations/vercel-analytics.md): Configure Vercel Analytics with c15t v3, understand measurement permission and verify loading and revocation.
- [X Pixel](./docs/integrations/x-pixel.md): Configure X Pixel with c15t v3, understand marketing permission and verify loading and revocation.
- [YouTube](./docs/integrations/youtube.md): Gate YouTube embeds with c15t v3 in Next.js, TanStack Start, React, Nuxt, Vue, Astro, Svelte, SvelteKit or JavaScript.

## Reference

- [Upgrade to v3 policies](./docs/upgrade-v3.md): Migrate policy configuration, consent records, callbacks, and custom transports to the v3 policy system.
