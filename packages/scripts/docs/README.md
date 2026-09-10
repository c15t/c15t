# @c15t/scripts

> Consent-aware vendor integrations and Consent Mode loading contracts.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Using these docs

These docs describe v3. Start with Inth hosted setup, identify the framework, router and deployment, then read its quickstart. Static sites can use Inth directly. Use page Markdown and package-bundled docs for targeted context. Verify scripts, rejection, reload and preferences; banner visibility alone is insufficient.

## Start here

- [Customize your consent interface](./customization/overview.md): Choose presentation, theme tokens, slots or custom markup for the change you need.
- [Verify consent before shipping](./guides/verify-consent.md): Test requests, policy resolution, persistence, navigation and preference changes in a production build.
- [Upgrade to v3 policies](./upgrade-v3.md): Migrate policy configuration, consent records, callbacks, and custom transports to the v3 policy system.

## More documentation

[Documentation index](https://c15t.com/docs/llms.txt) · [Full Markdown context](https://c15t.com/llms-full.txt). Prefer the index and individual pages for focused tasks.

## Frameworks

- [JavaScript script loading](./frameworks/javascript/script-loader.md): Attach a script loader to the consent kernel and dispose it with the application.
- [Load scripts with consent](./frameworks/next/script-loader.md): Register vendor scripts once and let effective permissions control loading.
- [Load scripts with consent](./frameworks/react/script-loader.md): Register vendor scripts once and let effective permissions control loading.

## Guides

- [Understand consent state](./guides/consent-state.md): Distinguish policy resolution, effective permissions, explicit choices, notices and privacy signals.
- [Data fetching and transports](./guides/data-fetching.md): Choose cached manifests, backend init or offline policy resolution, and understand where consent records are saved.
- [Choose a deployment mode](./guides/deployment-modes.md): Choose who runs your consent backend, then select manifest, init or offline resolution for your deployment.
- [Troubleshoot consent](./guides/troubleshooting.md): Diagnose missing banners, early vendor requests, lost choices and hydration differences.
- [Verify consent before shipping](./guides/verify-consent.md): Test requests, policy resolution, persistence, navigation and preference changes in a production build.

## Customization

- [Customize your consent interface](./customization/overview.md): Choose presentation, theme tokens, slots or custom markup for the change you need.
- [Banner styling recipes](./customization/recipes.md): See real v3 components and reuse the exact theme configuration behind the examples.
- [Style component slots](./customization/slots.md): Target a specific c15t component part without replacing its markup or behavior.
- [Theme tokens and CSS](./customization/tokens.md): Style c15t with semantic tokens and use the stylesheet that matches your CSS tooling.
- [Copy and translations](./customization/translations.md): Change consent wording through i18n and test the complete prompt and preferences flow.

## Integrations

- [Adobe Analytics](./integrations/adobe-analytics.md): Configure Adobe Analytics with c15t v3, understand measurement permission and verify loading and revocation.
- [Ahrefs Analytics](./integrations/ahrefs-analytics.md): Configure Ahrefs Analytics with c15t v3, understand measurement permission and verify loading and revocation.
- [Amplitude](./integrations/amplitude.md): Configure Amplitude with c15t v3, understand measurement permission and verify loading and revocation.
- [Custom integrations](./integrations/building-integrations.md): Define loading, initialization and consent-change behavior for a vendor without a helper.
- [Clearbit](./integrations/clearbit.md): Configure Clearbit with c15t v3, understand marketing permission and verify loading and revocation.
- [Cloudflare Web Analytics](./integrations/cloudflare-web-analytics.md): Configure Cloudflare Web Analytics with c15t v3, understand measurement permission and verify loading and revocation.
- [Crisp](./integrations/crisp.md): Configure Crisp with c15t v3, understand functionality permission and verify loading and revocation.
- [Databuddy](./integrations/databuddy.md): Configure Databuddy's initial and updated consent state with c15t v3.
- [Fathom Analytics](./integrations/fathom-analytics.md): Configure Fathom Analytics with c15t v3, understand measurement permission and verify loading and revocation.
- [Google Maps](./integrations/google-maps.md): Prevent a map iframe from mounting before the required permission.
- [Google Tag](./integrations/google-tag.md): Configure gtag with c15t Consent Mode signals and understand its loading behavior.
- [Google Tag Manager](./integrations/google-tag-manager.md): Load GTM with c15t consent signals and verify the tags inside your container.
- [Heap](./integrations/heap.md): Configure Heap with c15t v3, understand measurement permission and verify loading and revocation.
- [Hightouch](./integrations/hightouch.md): Configure Hightouch with c15t v3, understand measurement permission and verify loading and revocation.
- [Hotjar](./integrations/hotjar.md): Configure Hotjar with c15t v3, understand measurement permission and verify loading and revocation.
- [Intercom](./integrations/intercom.md): Load the Intercom messenger with functionality permission and configure its region.
- [LinkedIn Insight Tag](./integrations/linkedin-insights.md): Configure LinkedIn Insight Tag with c15t v3, understand marketing permission and verify loading and revocation.
- [LogRocket](./integrations/logrocket.md): Configure LogRocket with c15t v3, understand measurement permission and verify loading and revocation.
- [Matomo Analytics](./integrations/matomo-analytics.md): Choose gated loading or Matomo consent signaling and configure the correct tracker endpoints.
- [Meta Pixel](./integrations/meta-pixel.md): Register the Meta Pixel under marketing permission and verify event calls after revocation.
- [Microsoft Clarity](./integrations/microsoft-clarity.md): Configure Microsoft Clarity with c15t v3, understand measurement permission and verify loading and revocation.
- [Microsoft UET](./integrations/microsoft-uet.md): Configure Microsoft UET with c15t v3, understand marketing permission and verify loading and revocation.
- [Mixpanel](./integrations/mixpanel-analytics.md): Configure Mixpanel with c15t v3, understand measurement permission and verify loading and revocation.
- [Overview](./integrations/overview.md): Find all c15t integrations for analytics, tag managers, advertising, chat and embedded content.
- [Pirsch](./integrations/pirsch.md): Configure Pirsch with c15t v3, understand measurement permission and verify loading and revocation.
- [Plausible Analytics](./integrations/plausible-analytics.md): Configure Plausible Analytics with c15t v3, understand measurement permission and verify loading and revocation.
- [PostHog](./integrations/posthog.md): Choose PostHog loading and cookieless behavior, configure the region, and synchronize v3 permissions.
- [Promptwatch](./integrations/promptwatch.md): Configure Promptwatch with c15t v3, understand measurement permission and verify loading and revocation.
- [Reddit Pixel](./integrations/reddit-pixel.md): Configure Reddit Pixel with c15t v3, understand marketing permission and verify loading and revocation.
- [RudderStack](./integrations/rudderstack.md): Gate the RudderStack browser SDK or map c15t categories to destination consent IDs.
- [Rybbit Analytics](./integrations/rybbit-analytics.md): Configure Rybbit Analytics with c15t v3, understand measurement permission and verify loading and revocation.
- [Segment](./integrations/segment.md): Configure Segment with c15t v3, understand measurement permission and verify loading and revocation.
- [Snapchat Pixel](./integrations/snapchat-pixel.md): Configure Snapchat Pixel with c15t v3, understand marketing permission and verify loading and revocation.
- [TikTok Pixel](./integrations/tiktok-pixel.md): Configure TikTok Pixel with c15t v3, understand marketing permission and verify loading and revocation.
- [Umami Analytics](./integrations/umami-analytics.md): Configure Umami Analytics with c15t v3, understand measurement permission and verify loading and revocation.
- [Vercel Analytics](./integrations/vercel-analytics.md): Configure Vercel Analytics with c15t v3, understand measurement permission and verify loading and revocation.
- [X Pixel](./integrations/x-pixel.md): Configure X Pixel with c15t v3, understand marketing permission and verify loading and revocation.
- [YouTube](./integrations/youtube.md): Gate YouTube embeds with c15t v3 in Next.js, TanStack Start, React, Nuxt, Vue, Astro, Svelte, SvelteKit or JavaScript.

## Reference

- [Upgrade to v3 policies](./upgrade-v3.md): Migrate policy configuration, consent records, callbacks, and custom transports to the v3 policy system.
