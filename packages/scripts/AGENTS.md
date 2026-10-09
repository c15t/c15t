# @c15t/scripts

> Deprecated v3 compatibility package for @c15t/integrations. Migrate before v4.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Using these docs

These docs describe c15t v3. Find your app's row in Choose your setup, then follow that framework guide from start to finish; it names the files to create and the backend URL to use. Install c15t packages with the @alpha dist-tag, because npm latest is still v2. A visible banner does not prove anything: check that vendor requests wait for consent, that rejection survives a reload, and that preferences can be reopened.

## Start here

- [Connect your integrations](./docs/integrations/overview.md)
- [Choose your setup](./docs/concepts/choose-your-setup.md): Pick the c15t setup for your framework, rendering mode and hosting, and decide who runs the consent backend.
- [How consent works](./docs/concepts/how-consent-works.md): What c15t decides on each page load, the difference between a permission and a recorded choice, and what happens when a visitor saves.
- [Customize the interface](./docs/customization/overview.md): Change c15t's consent banner and dialog one step at a time, from a prop to your own markup, and find where each step lives in your framework.
- [Verify consent](./docs/guides/verify-consent.md): Check in a production build that vendor requests wait for consent, rejection survives a reload, preferences reopen and privacy signals apply.
- [Migrate to v3](./docs/upgrade-v3.md): Upgrade from c15t v2 to v3. Pick the guide for the v2 package you use (@c15t/nextjs, @c15t/react or the c15t store), rename @c15t/scripts, keep visitors' choices, and upgrade a self-hosted backend and the Node.js SDK.

## More documentation

[Documentation index](https://c15t.com/docs/llms.txt) · [Full Markdown context](https://c15t.com/llms-full.txt). Prefer the index and individual pages for focused tasks.

## Frameworks

### Next.js

- [Embeds](./docs/frameworks/next/embeds.md): Keep YouTube videos, maps and other iframes out of a Next.js page until their consent category is allowed, with ConsentGate or the iframe blocker in ConsentRoot.
- [Network blocker](./docs/frameworks/next/network-blocker.md): Hold fetch and XMLHttpRequest calls in a Next.js app until their consent category is allowed, with networkBlocker rules on ConsentRoot.
- [Scripts](./docs/frameworks/next/scripts.md): Register vendor scripts in a Next.js ConsentRoot, check how each vendor loads, let visitors turn off one vendor and clear stored data after revocation.

### TanStack Start

- [Embeds](./docs/frameworks/tanstack-start/embeds.md): Keep YouTube videos, maps and other iframes out of a TanStack Start page until their consent category is allowed, with ConsentGate or the iframe blocker in ConsentRoot.
- [Network blocker](./docs/frameworks/tanstack-start/network-blocker.md): Hold fetch and XMLHttpRequest calls in a TanStack Start app until their consent category is allowed, with networkBlocker rules on ConsentRoot.
- [Scripts](./docs/frameworks/tanstack-start/scripts.md): Load vendor scripts by consent category in a TanStack Start app with ConsentRoot, and clear stored data or reload the page when a visitor withdraws consent.

### React

- [Embeds](./docs/frameworks/react/embeds.md): Keep YouTube videos, maps and other iframes out of a React page until their consent category is allowed, with ConsentGate or the iframe blocker in ConsentProvider.
- [Network blocker](./docs/frameworks/react/network-blocker.md): Hold fetch and XMLHttpRequest calls in a React app until their consent category is allowed, with networkBlocker rules in the ConsentProvider options.
- [Scripts](./docs/frameworks/react/scripts.md): Load vendor scripts by consent category in a React app with ConsentProvider, and clear stored data or reload the page when a visitor withdraws consent.

### Nuxt

- [Embeds](./docs/frameworks/nuxt/embeds.md): Keep YouTube videos, maps and other iframes out of a Nuxt page until their consent category is allowed, with ConsentGate or the iframe blocker.
- [Network blocker](./docs/frameworks/nuxt/network-blocker.md): Hold fetch and XMLHttpRequest calls in a Nuxt app until their consent category is allowed, with rules in the c15t module options.
- [Scripts](./docs/frameworks/nuxt/scripts.md): Load vendor scripts by consent category in a Nuxt app with the c15t Nuxt module, and what happens when a visitor withdraws consent.

### Vue

- [Embeds](./docs/frameworks/vue/embeds.md): Keep YouTube videos, maps and other iframes out of a Vue page until their consent category is allowed, with ConsentGate or the iframe blocker.
- [Network blocker](./docs/frameworks/vue/network-blocker.md): Hold fetch and XMLHttpRequest calls in a Vue app until their consent category is allowed, with rules passed to the c15t Vue plugin.
- [Scripts](./docs/frameworks/vue/scripts.md): Load vendor scripts by consent category in a Vue app with the c15t Vue plugin, and what happens when a visitor withdraws consent.

### Astro

- [Embeds](./docs/frameworks/astro/embeds.md): Gate YouTube videos, maps, social posts and other iframes on an Astro site so they load only after the visitor allows their consent category, with a custom element or the c15t iframe blocker.
- [Network blocker](./docs/frameworks/astro/network-blocker.md): Block fetch and XMLHttpRequest calls to tracking hosts on an Astro site until the visitor allows their consent category, with c15t's network blocker rules and an onRequestBlocked handler.
- [Scripts](./docs/frameworks/astro/scripts.md): Load vendor scripts and gated inline scripts on an Astro site only after the visitor allows their consent category, and stop them when consent is withdrawn.

### Svelte

- [Embeds](./docs/frameworks/svelte/embeds.md): Keep YouTube videos, maps and other iframes out of a Svelte page until their consent category is allowed, with ConsentGate or the iframe blocker.
- [Network blocker](./docs/frameworks/svelte/network-blocker.md): Hold fetch and XMLHttpRequest calls to tracking domains in a Svelte app until their consent category is allowed, with the provider's networkBlocker option.
- [Scripts](./docs/frameworks/svelte/scripts.md): Load vendor scripts, iframes and network requests in a Svelte app only after the visitor allows their consent category, and stop them when consent is withdrawn.

### SvelteKit

- [Embeds](./docs/frameworks/sveltekit/embeds.md): Keep YouTube videos, maps and other iframes out of SvelteKit server HTML and the browser until their consent category is allowed.
- [Network blocker](./docs/frameworks/sveltekit/network-blocker.md): Hold browser fetch and XMLHttpRequest calls to tracking domains in a SvelteKit app until their consent category is allowed, with the networkBlocker option.
- [Scripts](./docs/frameworks/sveltekit/scripts.md): Load vendor scripts, iframes and network requests in a SvelteKit app only after the visitor allows their consent category, and stop them when consent is withdrawn.

### HTML script tag

- [Embeds](./docs/frameworks/html/embeds.md): Hold YouTube videos, maps and other iframes on a plain HTML page until their consent category is allowed with data-src and data-category, show a placeholder, and configure the c15t iframe blocker.
- [Network blocker](./docs/frameworks/html/network-blocker.md): Hold fetch and XMLHttpRequest calls from a plain HTML page until their consent category is allowed, with network blocker rules queued on the c15t script tag.
- [Scripts](./docs/frameworks/html/scripts.md): Hold vendor scripts on a plain HTML page until the visitor allows their category, load scripts with callbacks, handle withdrawal and clear vendor cookies with the c15t script tag and no build step.

### JavaScript

- [Scripts](./docs/frameworks/javascript/scripts.md): Register vendor scripts with @c15t/browser, createConsentRuntime or a consent kernel in JavaScript, and control what happens when a visitor withdraws permission.

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
- [Stylesheets and CSS layers](./docs/customization/stylesheets.md): See how c15t delivers its styles in each framework without a render-blocking stylesheet, when to import styles.css yourself with styles false, which file holds the dialog's rules, and how c15t's cascade layer meets your own.
- [Tailwind CSS](./docs/customization/tailwind.md): Use c15t's styles with Tailwind CSS 4 or 3 in every framework, put utilities on c15t component parts, and use Tailwind's dark variant with c15t.
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
- [Sentry](./docs/integrations/sentry.md): Configure Sentry's CDN or your own SDK with consent for error monitoring, Session Replay and user data.
- [Snapchat Pixel](./docs/integrations/snapchat-pixel.md): Load the Snapchat Pixel only after marketing consent with the c15t snapchatPixel helper, guard snaptr event calls, and check it in DevTools.
- [TikTok Pixel](./docs/integrations/tiktok-pixel.md): Load the TikTok Pixel only after marketing consent with the c15t tiktokPixel helper, guard ttq event calls, and check it in DevTools.
- [Umami Analytics](./docs/integrations/umami-analytics.md): Load the Umami Analytics tracker only after measurement consent with the c15t umamiAnalytics helper, point it at a self-hosted instance, and check it in DevTools.
- [Vercel Analytics](./docs/integrations/vercel-analytics.md): Load the Vercel Web Analytics script only after measurement consent with the c15t vercelAnalytics helper, choose the debug script, and check it in DevTools.
- [X Pixel](./docs/integrations/x-pixel.md): Load the X Pixel only after marketing consent with the c15t xPixel helper, guard twq conversion events, and check it in DevTools.
- [YouTube](./docs/integrations/youtube.md): Gate YouTube embeds with c15t v3 in Next.js, TanStack Start, React, Nuxt, Vue, Astro, Svelte, SvelteKit or JavaScript.

## Reference

- [Migrate to v3](./docs/upgrade-v3.md): Upgrade from c15t v2 to v3. Pick the guide for the v2 package you use (@c15t/nextjs, @c15t/react or the c15t store), rename @c15t/scripts, keep visitors' choices, and upgrade a self-hosted backend and the Node.js SDK.
