# @c15t/nextjs

> Next.js v3 App Router, Pages Router, static export and hydration with Inth.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Using these docs

These docs describe c15t v3. Find your app's row in Choose your setup, then follow that framework guide from start to finish; it names the files to create and the backend URL to use. Install c15t packages with the @alpha dist-tag, because npm latest is still v2. A visible banner does not prove anything: check that vendor requests wait for consent, that rejection survives a reload, and that preferences can be reopened.

## Start here

- [Next.js quickstart](./docs/frameworks/next/quickstart.md)
- [App Router setup](./docs/frameworks/next/app-router.md)
- [Pages Router setup](./docs/frameworks/next/pages-router.md)
- [Static export setup](./docs/frameworks/next/static-export.md)
- [Choose your setup](./docs/concepts/choose-your-setup.md): Pick the c15t setup for your framework, rendering mode and hosting, and decide who runs the consent backend.
- [How consent works](./docs/concepts/how-consent-works.md): What c15t decides on each page load, the difference between a permission and a recorded choice, and what happens when a visitor saves.
- [Customize the interface](./docs/customization/overview.md): Change c15t's consent banner and dialog one step at a time, from a prop to your own markup, and find where each step lives in your framework.
- [Verify consent](./docs/guides/verify-consent.md): Check in a production build that vendor requests wait for consent, rejection survives a reload, preferences reopen and privacy signals apply.
- [Migrate to v3](./docs/upgrade-v3.md): Upgrade from c15t v2 to v3. Pick the guide for the v2 package you use (@c15t/nextjs, @c15t/react or the c15t store), rename @c15t/scripts, keep visitors' choices, and upgrade a self-hosted backend and the Node.js SDK.

## More documentation

[Documentation index](https://c15t.com/docs/llms.txt) · [Full Markdown context](https://c15t.com/llms-full.txt). Prefer the index and individual pages for focused tasks.

## Frameworks

- [App Router](./docs/frameworks/next/app-router.md): Set up c15t in the Next.js App Router with Inth, a build-time policy manifest, consent-gated scripts and a streamed or awaited root layout.
- [Callbacks](./docs/frameworks/next/callbacks.md): Run code in a Next.js app when a visitor records a consent choice, when permissions change, when a request fails and before the revocation reload, from the Client Component that renders ConsentRoot.
- [Clear on revocation](./docs/frameworks/next/clear-on-revocation.md): Delete the first-party cookies and Web Storage keys a consent category owns in a Next.js app when that category is denied, with the clearOnRevocation prop on ConsentRoot.
- [Client-side initialization](./docs/frameworks/next/client-side.md): Initialize c15t in the browser in a Next.js app with one backend URL, without server prefetch, a manifest route or API handlers.
- [Components](./docs/frameworks/next/components.md): Every c15t component a Next.js app imports from c15t/next, what each renders, which ones are Client Components, and where to start.
- [ConsentBanner](./docs/frameworks/next/components/consent-banner.md): Render the pre-built ConsentBanner inside a Next.js ConsentRoot and configure its variants, per-policy buttons and compound parts.
- [ConsentDialog](./docs/frameworks/next/components/consent-dialog.md): Mount ConsentDialog as a Client Component inside a Next.js ConsentRoot to open the preference center from the banner, links and triggers.
- [ConsentDialogLink](./docs/frameworks/next/components/consent-dialog-link.md): Open the preference center from a Next.js footer with ConsentDialogLink, a Client Component that renders an unstyled button inside ConsentRoot.
- [ConsentDialogTrigger](./docs/frameworks/next/components/consent-dialog-trigger.md): Add the floating ConsentDialogTrigger button or toolbar to a Next.js ConsentRoot so visitors can reopen the preference center.
- [ConsentGate](./docs/frameworks/next/components/consent-gate.md): Consent-gate an iframe in Next.js with ConsentGate inside ConsentRoot; with server prefetch the server HTML carries the placeholder for a denied category, and a granted embed mounts after hydration.
- [ConsentRoot](./docs/frameworks/next/components/consent-root.md): Mount the Next.js ConsentRoot once from a 'use client' wrapper, pass it the server-resolved state and your shared c15t config, and see how it picks the consent transport from its URLs.
- [ConsentWidget](./docs/frameworks/next/components/consent-widget.md): Render ConsentWidget on a Next.js privacy page inside ConsentRoot as an inline preference center, server-rendered when the route resolves consent.
- [DevTools](./docs/frameworks/next/components/dev-tools.md): Load the c15t DevTools panel only in Next.js development builds to inspect consent state, scripts, policy and events inside ConsentRoot.
- [Compose your own banner](./docs/frameworks/next/compose.md): Build a Next.js consent banner as a Client Component from the ConsentBanner parts in c15t/next, with your own markup and buttons, rendered inside ConsentRoot.
- [Content Security Policy](./docs/frameworks/next/content-security-policy.md): Pass a per-request CSP nonce to ConsentRoot in Next.js and allow the consent backend in connect-src.
- [Customize](./docs/frameworks/next/customize.md): Load the c15t stylesheet in Next.js and change colors, radius, button roles, component parts, dark mode and banner shape with ConsentTheme and ConsentRoot options.
- [Data fetching reference](./docs/frameworks/next/data-fetching-reference.md): Reference for Next.js consent URLs, manifest resolution, request geography and offline configuration.
- [Embeds](./docs/frameworks/next/embeds.md): Keep YouTube videos, maps and other iframes out of a Next.js page until their consent category is allowed, with ConsentGate or the iframe blocker in ConsentRoot.
- [Geography headers](./docs/frameworks/next/geography-headers.md): Use c15tProxy in Next.js proxy.ts or middleware.ts so Server Components and Route Handlers receive the visitor's country and region.
- [IAB GPP](./docs/frameworks/next/gpp.md): Add the IAB Global Privacy Platform API (__gpp) to a Next.js app with ConsentGPP from c15t/react/gpp, so ad tech can read US state opt-outs and the TCF EU consent string.
- [Headless](./docs/frameworks/next/headless.md): Build a custom consent banner in Next.js with the c15t/next/headless hooks inside your existing ConsentRoot.
- [Hooks](./docs/frameworks/next/hooks.md): Gate features and save consent choices in Next.js Client Components with the focused hooks exported from c15t/next.
- [IAB TCF](./docs/frameworks/next/iab.md): Mount the IAB TCF banner and dialog inside a Next.js ConsentRoot and configure the CMP ID, policy and vendor data.
- [Network blocker](./docs/frameworks/next/network-blocker.md): Hold fetch and XMLHttpRequest calls in a Next.js app until their consent category is allowed, with networkBlocker rules on ConsentRoot.
- [Performance](./docs/frameworks/next/optimization.md): Bundle policy at build time to avoid manifest fetch latency, use runtime caching when policies must refresh without a rebuild, and optionally keep browser consent requests on your origin.
- [Pages Router](./docs/frameworks/next/pages-router.md): Set up c15t in the Next.js Pages Router with Inth, a build-time policy manifest, getServerSideProps and consent-gated scripts.
- [Quickstart](./docs/frameworks/next/quickstart.md): Add c15t consent management to a Next.js App Router app with Inth, a build-time policy manifest and consent-gated scripts, then check it works. Links to the Pages Router and static export guides.
- [Rendering and deployment](./docs/frameworks/next/rendering.md): Choose how Next.js resolves consent for your router, rendering mode and hosting, from streamed App Router layouts to static export, ISR and Cache Components.
- [Scripts](./docs/frameworks/next/scripts.md): Register vendor scripts in a Next.js ConsentRoot, check how each vendor loads, let visitors turn off one vendor and clear stored data after revocation.
- [Static export](./docs/frameworks/next/static-export.md): Add c15t to a Next.js site built with output export, where the browser resolves consent through Inth without request helpers or API routes.
- [Translations](./docs/frameworks/next/translations.md): Where c15t banner and dialog copy comes from in Next.js, how the server and browser pick the visitor's language, and how to override copy and switch languages from a Client Component.
- [Troubleshooting](./docs/frameworks/next/troubleshooting.md): Diagnose failed c15t consent prefetch in Next.js, verify manifest requests, and fix symbol serialization warnings, unknown server location and prerendering errors.
- [Upgrade from v2](./docs/frameworks/next/upgrade-v3.md): Upgrade a Next.js app from c15t v2 (@c15t/nextjs) to v3. Covers packages, ConsentRoot or ConsentProvider, the useConsentManager codemod, callbacks, policies, styles, IAB and stored consent.
- [Vendor consent](./docs/frameworks/next/vendor-consent.md): Let visitors allow a category such as marketing in a Next.js app and still turn off one vendor in it, with the vendors prop on ConsentRoot and useVendorAllowed.

## Concepts

- [Choose your setup](./docs/concepts/choose-your-setup.md): Pick the c15t setup for your framework, rendering mode and hosting, and decide who runs the consent backend.
- [Consent categories](./docs/concepts/consent-categories.md): Assign scripts, embeds and features to c15t consent categories, and understand which categories the preference dialog shows.
- [Consent state reference](./docs/concepts/consent-state.md): How c15t saves choices, gates IAB vendors, hydrates server records and keeps browser tabs and storage in step.
- [Data fetching](./docs/concepts/data-fetching.md): Choose the recommended build-time policy snapshot or runtime manifest fetching, backend /init, browser resolution or offline rules, and understand where consent choices are saved.
- [How consent works](./docs/concepts/how-consent-works.md): What c15t decides on each page load, the difference between a permission and a recorded choice, and what happens when a visitor saves.
- [Policies](./docs/concepts/policies.md): How policy models, prompts and scope decide what c15t asks visitors, where to change the rules, and why a banner may not appear.

## Guides

- [Banner experiments](./docs/guides/banner-experiments.md): Run A/B tests on consent banner presentation with any feature-flag provider or built-in weighted assignment, and attribute every impression and choice to its arm.
- [Troubleshooting](./docs/guides/troubleshooting.md): Fix a missing banner, analytics that load before consent, choices lost on reload, CORS errors, hydration differences and failed static builds in c15t v3.
- [Verify consent](./docs/guides/verify-consent.md): Check in a production build that vendor requests wait for consent, rejection survives a reload, preferences reopen and privacy signals apply.

## Customization

- [Class names and CSS-in-JS](./docs/customization/class-names.md): Style c15t's component parts with CSS Modules, vanilla-extract, StyleX, Emotion or plain class names, and see which approach works in each framework.
- [Dark mode](./docs/customization/dark-mode.md): Switch c15t's banner and dialog to dark colors with colorScheme, set your own dark tokens, follow your site's theme switch, and paint dark on the first frame in every framework.
- [Motion and animation](./docs/customization/motion.md): Change how fast c15t's banner and dialog animate with duration and easing tokens, turn animations off per surface with disableAnimation, and check reduced-motion behavior in each framework.
- [Customize the interface](./docs/customization/overview.md): Change c15t's consent banner and dialog one step at a time, from a prop to your own markup, and find where each step lives in your framework.
- [Banner designs](./docs/customization/recipes.md): Five consent banner designs built with c15t, from one prop to your own markup, with tested code for React, Vue, Svelte, Astro and plain HTML.
- [Component parts](./docs/customization/slots.md): Find every part of c15t's banner, dialog, widget, trigger and ConsentGate placeholder, its key in your framework's part API, and the data attributes to select on.
- [Stylesheets and CSS layers](./docs/customization/stylesheets.md): Load the right c15t stylesheet for your framework, see when the dialog's CSS loads, order c15t's cascade layer against your own, and run c15t without its styles.
- [Tailwind CSS](./docs/customization/tailwind.md): Load c15t's styles next to Tailwind CSS 4 or 3 in every framework, put utilities on c15t component parts, and use Tailwind's dark variant with c15t.
- [Theme tokens](./docs/customization/tokens.md): Change c15t's colors, type, radius, spacing, shadows and motion with theme tokens, and see every --c15t-* variable with its default.
- [Copy and translations](./docs/customization/translations.md): Change consent wording through i18n and test the complete prompt and preferences flow.

## Integrations

- [Adobe Analytics](./docs/integrations/adobe-analytics.md): Load an Adobe Data Collection Tags property only after measurement consent with the c15t adobeAnalytics helper, and check its extensions in DevTools.
- [Ahrefs Analytics](./docs/integrations/ahrefs-analytics.md): Load Ahrefs Web Analytics only after measurement consent with the c15t ahrefsAnalytics helper, and check it in DevTools.
- [Amplitude](./docs/integrations/amplitude.md): Load the Amplitude Browser SDK 2 only after measurement consent with the c15t amplitude helper, which opts the SDK out on revocation and back in on a new grant.
- [Custom integrations](./docs/integrations/building-integrations.md): Gate a vendor that has no @c15t/integrations helper, or sync consent with an SDK your app already loads, using a c15t script configuration.
- [Clearbit](./docs/integrations/clearbit.md): Load the Clearbit enrichment tag only after marketing consent with the c15t clearbit helper, and check it in DevTools.
- [Cloudflare Web Analytics](./docs/integrations/cloudflare-web-analytics.md): Load the Cloudflare Web Analytics beacon only after measurement consent with the c15t cloudflareWebAnalytics helper, and check it in DevTools.
- [Cloudflare Zaraz](./docs/integrations/cloudflare-zaraz.md): Sync c15t permissions to Cloudflare Zaraz purposes with the c15t cloudflareZaraz bridge, which runs on every page without loading a script, and check the tools it controls.
- [Crisp](./docs/integrations/crisp.md): Load the Crisp chat widget only after functionality consent with the c15t crisp helper, pass its runtime settings and check it in DevTools.
- [Databuddy](./docs/integrations/databuddy.md): Load the Databuddy SDK on every page with the c15t databuddy helper, switch its disabled flag and config from measurement consent, and check both in DevTools.
- [Fathom Analytics](./docs/integrations/fathom-analytics.md): Load Fathom Analytics only after measurement consent with the c15t fathomAnalytics helper, set its SPA mode, and check it in DevTools.
- [Front Chat](./docs/integrations/front-chat.md): Load the Front Chat widget only after functionality consent with the c15t frontChat helper, forward CSP nonces, clear the session on revocation and check it in DevTools.
- [Google Maps](./docs/integrations/google-maps.md): Gate a Google Maps iframe embed with c15t v3 so the map loads only after the visitor allows its consent category, in Next.js, TanStack Start, React, Nuxt, Vue, Astro, Svelte, SvelteKit, HTML or JavaScript.
- [Google Tag](./docs/integrations/google-tag.md): Load gtag.js for Google Analytics or Google Ads with c15t Consent Mode v2 signals, and verify the consent commands in DevTools.
- [Google Tag Manager](./docs/integrations/google-tag-manager.md): Load a Google Tag Manager container with c15t Consent Mode v2 signals, configure consent checks inside the container, and verify both in DevTools.
- [Heap](./docs/integrations/heap.md): Load the Heap config script and heap.js only after measurement consent with the c15t heap helper, and check it in DevTools.
- [Hightouch](./docs/integrations/hightouch.md): Load the Hightouch Events browser SDK only after measurement consent with the c15t hightouch helper, and check page events in DevTools.
- [Hotjar](./docs/integrations/hotjar.md): Load Hotjar only after measurement consent with the c15t hotjar helper, and check its loader and recordings in DevTools.
- [Intercom](./docs/integrations/intercom.md): Load the Intercom messenger only after functionality consent with the c15t intercom helper, set its region and check it in DevTools.
- [Klaviyo](./docs/integrations/klaviyo.md): Load Klaviyo signup forms and onsite tracking only after marketing and measurement consent with the c15t klaviyo helper, gate your own events, and check it in DevTools.
- [LinkedIn Insight Tag](./docs/integrations/linkedin-insights.md): Load the LinkedIn Insight Tag only after marketing consent with the c15t linkedinInsights helper, guard lintrk conversion calls, and check it in DevTools.
- [LogRocket](./docs/integrations/logrocket.md): Load LogRocket session replay only after measurement consent with the c15t logRocket helper, including proxied setups, and check it in DevTools.
- [Matomo Analytics](./docs/integrations/matomo-analytics.md): Load Matomo after measurement consent with the c15t matomoAnalytics helper, or use Matomo's own consent mode, and check each mode in DevTools.
- [Meta Pixel](./docs/integrations/meta-pixel.md): Load the Meta Pixel only after marketing consent with the c15t metaPixel helper, guard fbq event calls, and check it in DevTools.
- [Microsoft Clarity](./docs/integrations/microsoft-clarity.md): Load Microsoft Clarity only after measurement consent with the c15t clarity helper, send Consent V2 storage signals and check them in DevTools.
- [Microsoft UET](./docs/integrations/microsoft-uet.md): Load Microsoft Advertising UET on every page with the c15t microsoftUet helper, send ad_storage consent defaults and updates, and verify both in DevTools.
- [Mixpanel](./docs/integrations/mixpanel-analytics.md): Load the Mixpanel SDK on every page with the c15t mixpanelAnalytics helper, which switches Mixpanel tracking on and off with measurement consent, and check it in DevTools.
- [OneDollarStats](./docs/integrations/one-dollar-stats.md): Load the OneDollarStats tracker only after measurement consent with the c15t oneDollarStats helper, forward its data-attribute settings, and check it in DevTools.
- [OpenAI Pixel](./docs/integrations/openai-pixel.md): Load the ChatGPT Ads Measurement Pixel only after marketing consent with the c15t openaiPixel helper, guard oaiq conversion calls, and check it in DevTools.
- [Integrations](./docs/integrations/overview.md): Find all c15t integrations for analytics, tag managers, advertising, email and SMS, chat and embedded content.
- [Pinterest Tag](./docs/integrations/pinterest-tag.md): Load the Pinterest Tag only after marketing consent with the c15t pinterestTag helper, guard pintrk event calls, and check it in DevTools.
- [Pirsch](./docs/integrations/pirsch.md): Load Pirsch Analytics only after measurement consent with the c15t pirsch helper, keep custom event bindings working, and check it in DevTools.
- [Plausible Analytics](./docs/integrations/plausible-analytics.md): Load the Plausible Analytics tracker only after measurement consent with the c15t plausibleAnalytics helper, and check it in DevTools.
- [PostHog](./docs/integrations/posthog.md): Load PostHog before or after measurement consent with the c15t posthog helper, choose its cookieless behavior, turn off PostHog modules you do not use, and sync consent with an SDK you already initialize.
- [Promptwatch](./docs/integrations/promptwatch.md): Load the Promptwatch attribution client only after measurement consent with the c15t promptwatch helper, and check it in DevTools.
- [Reddit Pixel](./docs/integrations/reddit-pixel.md): Load the Reddit Pixel only after marketing consent with the c15t redditPixel helper, guard rdt conversion calls, and check it in DevTools.
- [RudderStack](./docs/integrations/rudderstack.md): Load the RudderStack JavaScript SDK after measurement consent with the c15t rudderstack helper, or map c15t categories to destination consent IDs, and check each mode.
- [Rybbit Analytics](./docs/integrations/rybbit-analytics.md): Load Rybbit Analytics only after measurement consent with the c15t rybbitAnalytics helper, map its tracking options to data attributes, and check it in DevTools.
- [Segment](./docs/integrations/segment.md): Load Segment Analytics.js only after measurement consent with the c15t segment helper, guard your own track and identify calls, and check it in DevTools.
- [Snapchat Pixel](./docs/integrations/snapchat-pixel.md): Load the Snapchat Pixel only after marketing consent with the c15t snapchatPixel helper, guard snaptr event calls, and check it in DevTools.
- [TikTok Pixel](./docs/integrations/tiktok-pixel.md): Load the TikTok Pixel only after marketing consent with the c15t tiktokPixel helper, guard ttq event calls, and check it in DevTools.
- [Umami Analytics](./docs/integrations/umami-analytics.md): Load the Umami Analytics tracker only after measurement consent with the c15t umamiAnalytics helper, point it at a self-hosted instance, and check it in DevTools.
- [Vercel Analytics](./docs/integrations/vercel-analytics.md): Load the Vercel Web Analytics script only after measurement consent with the c15t vercelAnalytics helper, choose the debug script, and check it in DevTools.
- [X Pixel](./docs/integrations/x-pixel.md): Load the X Pixel only after marketing consent with the c15t xPixel helper, guard twq conversion events, and check it in DevTools.
- [YouTube](./docs/integrations/youtube.md): Gate YouTube embeds with c15t v3 in Next.js, TanStack Start, React, Nuxt, Vue, Astro, Svelte, SvelteKit or JavaScript.

## Reference

- [Migrate to v3](./docs/upgrade-v3.md): Upgrade from c15t v2 to v3. Pick the guide for the v2 package you use (@c15t/nextjs, @c15t/react or the c15t store), rename @c15t/scripts, keep visitors' choices, and upgrade a self-hosted backend and the Node.js SDK.
