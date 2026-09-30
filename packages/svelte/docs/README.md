# @c15t/svelte

> Svelte and SvelteKit v3 providers, request loading and static hosting with Inth.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Using these docs

These docs describe c15t v3. Find your app's row in Choose your setup, then follow that framework guide from start to finish; it names the files to create and the backend URL to use. Install c15t packages with the @alpha dist-tag, because npm latest is still v2. A visible banner does not prove anything: check that vendor requests wait for consent, that rejection survives a reload, and that preferences can be reopened.

## Start here

- [Svelte quickstart](./frameworks/svelte/quickstart.md)
- [SvelteKit quickstart](./frameworks/sveltekit/quickstart.md)
- [Choose your setup](./concepts/choose-your-setup.md): Pick the c15t setup for your framework, rendering mode and hosting, and decide who runs the consent backend.
- [How consent works](./concepts/how-consent-works.md): What c15t decides on each page load, the difference between a permission and a recorded choice, and what happens when a visitor saves.
- [Customization](./customization/overview.md): Change c15t's consent banner and dialog one step at a time, from a prop to your own markup, and find where each step lives in your framework.
- [Verify consent](./guides/verify-consent.md): Check in a production build that vendor requests wait for consent, rejection survives a reload, preferences reopen and privacy signals apply.
- [Migrate to v3](./upgrade-v3.md): Upgrade a c15t v2 app to v3. Covers packages, the Next.js and React providers, the JavaScript runtime, custom UI built on useConsentManager, callbacks, policies, stored consent and a self-hosted backend.

## More documentation

[Documentation index](https://c15t.com/docs/llms.txt) · [Full Markdown context](https://c15t.com/llms-full.txt). Prefer the index and individual pages for focused tasks.

## Frameworks

### Svelte

- [Callbacks](./frameworks/svelte/callbacks.md): Run your own code in a Svelte app when a visitor records a choice or permissions change, with onChoiceRecorded, onPermissionsChanged and script callbacks.
- [Components](./frameworks/svelte/components.md): Props and behavior of every @c15t/svelte component in a Svelte app, from ConsentManagerProvider and ConsentBanner to ConsentGate and DevTools.
- [ConsentBanner](./frameworks/svelte/components/consent-banner.md): Show the c15t cookie banner in a Svelte app with ConsentBanner, and set its variant, position, button layout, copy, accessibility and styling hooks.
- [ConsentButton](./frameworks/svelte/components/consent-button.md): Accept, reject, save or open preferences from your own Svelte markup with ConsentButton, and what each action records.
- [ConsentDialog](./frameworks/svelte/components/consent-dialog.md): Add the c15t preference dialog to a Svelte app with ConsentDialog, including how it loads on first use, its props, keyboard behavior and theme slots.
- [ConsentDialogLink](./frameworks/svelte/components/consent-dialog-link.md): Let visitors reopen c15t preferences from a Svelte footer with ConsentDialogLink, an unstyled button that renders only when the policy offers preferences.
- [ConsentDialogTrigger](./frameworks/svelte/components/consent-dialog-trigger.md): Add a floating, draggable privacy button to a Svelte app with ConsentDialogTrigger, and set its corner, size, saved position, accessible name and callbacks.
- [ConsentGate](./frameworks/svelte/components/consent-gate.md): Keep a YouTube video or map out of a Svelte page until its consent category is allowed with ConsentGate, and replace its placeholder.
- [ConsentManagerProvider](./frameworks/svelte/components/consent-manager-provider.md): Mount ConsentManagerProvider at the root of a Svelte app to start c15t, with every prop, its default, and which options update after mount.
- [ConsentWidget](./frameworks/svelte/components/consent-widget.md): Put c15t's category switches inline on a Svelte privacy settings page with ConsentWidget, and how its draft, vendors and stale-policy alert behave.
- [DevTools](./frameworks/svelte/components/dev-tools.md): Inspect consent, scripts, location and events in a Svelte app with ConsentDevTools from @c15t/svelte/devtools, loaded only in development.
- [IABConsentBanner](./frameworks/svelte/components/iab-consent-banner.md): Show the IAB TCF 2.4 first-layer banner to visitors under an IAB policy in a Svelte app with IABConsentBanner, its props and behavior.
- [IABConsentDialog](./frameworks/svelte/components/iab-consent-dialog.md): Show the IAB TCF 2.4 preference center with purposes, features and vendors in a Svelte app with IABConsentDialog.
- [Primitives](./frameworks/svelte/components/primitives.md): Build your own accessible consent dialog in Svelte with the Dialog, Switch, Tabs, Accordion and PreferenceItem primitives and the focusTrap, scrollLock and portal actions.
- [Content Security Policy](./frameworks/svelte/content-security-policy.md): Write a Content Security Policy for a Svelte app using c15t, with the hosts to allow, the provider's nonce option and what c15t injects.
- [Customize](./frameworks/svelte/customize.md): Change c15t's colors, shape, button styles and copy in a Svelte app with a token stylesheet, theme slots, presentation props and translations.
- [Embeds](./frameworks/svelte/embeds.md): Keep YouTube videos, maps and other iframes out of a Svelte page until their consent category is allowed, with ConsentGate or the iframe blocker.
- [Context getters](./frameworks/svelte/getters.md): Reference for every @c15t/svelte context getter in a Svelte app, from reading permissions and recorded choices to saving, the draft, IAB state and kernel events.
- [Headless](./frameworks/svelte/headless.md): Replace the c15t banner or preference dialog with your own Svelte markup while the provider keeps policy, storage and script loading.
- [IAB TCF](./frameworks/svelte/iab.md): Turn on the IAB TCF 2.4 banner and preference center in a Svelte app with IABConsentBanner, IABConsentDialog and the provider's iab option.
- [Network blocker](./frameworks/svelte/network-blocker.md): Hold fetch and XMLHttpRequest calls to tracking domains in a Svelte app until their consent category is allowed, with the provider's networkBlocker option.
- [Quickstart](./frameworks/svelte/quickstart.md): Add a c15t cookie banner, preference dialog and consent-gated scripts to a Svelte 5 app built with Vite, using Inth for policies and consent records.
- [Scripts](./frameworks/svelte/scripts.md): Load vendor scripts, iframes and network requests in a Svelte app only after the visitor allows their consent category, and stop them when consent is withdrawn.
- [Translations](./frameworks/svelte/translations.md): Change c15t banner and dialog copy in a Svelte app with component text props or the provider's i18n option, and switch languages at runtime.
- [Troubleshooting](./frameworks/svelte/troubleshooting.md): Fix a missing banner, an unset backend URL, ignored theme colors and vendors that load before consent in a Svelte app.

### SvelteKit

- [Callbacks](./frameworks/sveltekit/callbacks.md): Run your own code in a SvelteKit app when a visitor records a choice or permissions change, with onChoiceRecorded, onPermissionsChanged and script callbacks.
- [Components](./frameworks/sveltekit/components.md): Props and behavior of every @c15t/svelte component in a SvelteKit app, from ConsentManagerProvider and ConsentBanner to ConsentGate and DevTools.
- [ConsentBanner](./frameworks/sveltekit/components/consent-banner.md): Show the c15t cookie banner in SvelteKit server HTML with ConsentBanner, and set its variant, position, button layout, copy, accessibility and styling hooks.
- [ConsentButton](./frameworks/sveltekit/components/consent-button.md): Accept, reject, save or open preferences from SvelteKit pages with ConsentButton, and what each action records.
- [ConsentDialog](./frameworks/sveltekit/components/consent-dialog.md): Add the c15t preference dialog to a SvelteKit root layout with ConsentDialog, including how it loads after hydration, its props, keyboard behavior and theme slots.
- [ConsentDialogLink](./frameworks/sveltekit/components/consent-dialog-link.md): Let visitors reopen c15t preferences from a SvelteKit layout footer with ConsentDialogLink, rendered in server HTML when the policy offers preferences.
- [ConsentDialogTrigger](./frameworks/sveltekit/components/consent-dialog-trigger.md): Add a floating, draggable privacy button to a SvelteKit layout with ConsentDialogTrigger, and set its corner, size, saved position, accessible name and callbacks.
- [ConsentGate](./frameworks/sveltekit/components/consent-gate.md): Keep a YouTube video or map out of SvelteKit server HTML until its consent category is allowed with ConsentGate, and replace its placeholder.
- [ConsentManagerProvider](./frameworks/sveltekit/components/consent-manager-provider.md): Mount ConsentManagerProvider in a SvelteKit root layout with a server prefetch so the banner is in the first HTML, with every prop and its default.
- [ConsentWidget](./frameworks/sveltekit/components/consent-widget.md): Put c15t's category switches inline on a SvelteKit privacy settings route with ConsentWidget, and how its draft, vendors and stale-policy alert behave.
- [DevTools](./frameworks/sveltekit/components/dev-tools.md): Inspect consent, scripts, location and events in a SvelteKit app with ConsentDevTools, imported only when $app/environment reports development.
- [IABConsentBanner](./frameworks/sveltekit/components/iab-consent-banner.md): Show the IAB TCF 2.4 first-layer banner to visitors under an IAB policy in a SvelteKit app with IABConsentBanner, its props and behavior.
- [IABConsentDialog](./frameworks/sveltekit/components/iab-consent-dialog.md): Show the IAB TCF 2.4 preference center with purposes, features and vendors in a SvelteKit app with IABConsentDialog.
- [Primitives](./frameworks/sveltekit/components/primitives.md): Build your own accessible consent dialog in SvelteKit with the Dialog, Switch, Tabs, Accordion and PreferenceItem primitives and the focusTrap, scrollLock and portal actions.
- [Content Security Policy](./frameworks/sveltekit/content-security-policy.md): Write a Content Security Policy for a SvelteKit app using c15t with kit.csp, covering vendor hosts, the server-rendered theme style and style attributes.
- [Customize](./frameworks/sveltekit/customize.md): Render c15t brand colors on the SvelteKit server with generateThemeCSS, and change slots, button styles, banner shape and copy.
- [Embeds](./frameworks/sveltekit/embeds.md): Keep YouTube videos, maps and other iframes out of SvelteKit server HTML and the browser until their consent category is allowed.
- [Geography headers](./frameworks/sveltekit/geography-headers.md): Which request headers SvelteKit's c15t helpers read for country, region, language and Global Privacy Control, how to trust them, and how to test another location.
- [Context getters](./frameworks/sveltekit/getters.md): Reference for every @c15t/svelte context getter in SvelteKit components, from reading permissions and recorded choices to saving, the draft, IAB state and events.
- [Headless](./frameworks/sveltekit/headless.md): Replace the c15t banner or preference dialog with your own markup in a SvelteKit app while the provider keeps policy, storage and script loading.
- [IAB TCF](./frameworks/sveltekit/iab.md): Turn on the IAB TCF 2.4 banner and preference center in a SvelteKit app with IABConsentBanner, IABConsentDialog and the provider's iab option.
- [Network blocker](./frameworks/sveltekit/network-blocker.md): Hold browser fetch and XMLHttpRequest calls to tracking domains in a SvelteKit app until their consent category is allowed, with the networkBlocker option.
- [Quickstart](./frameworks/sveltekit/quickstart.md): Resolve consent in a SvelteKit root layout load so the c15t banner is in the server HTML, then hydrate the provider with consent-gated scripts and a preferences link.
- [Rendering and deployment](./frameworks/sveltekit/rendering.md): Choose how a SvelteKit app resolves consent, on each request, from a cached manifest, or in the browser for prerendered pages, static sites and SPA mode, and deploy it to Node or edge adapters.
- [Scripts](./frameworks/sveltekit/scripts.md): Load vendor scripts, iframes and network requests in a SvelteKit app only after the visitor allows their consent category, and stop them when consent is withdrawn.
- [Server API](./frameworks/sveltekit/server-api.md): Reference for loadConsent, c15tHandle, createSvelteKitConsentRouteHandlers and resolveConsent from @c15t/svelte/kit and @c15t/svelte/server, with every option and default.
- [Translations](./frameworks/sveltekit/translations.md): Change c15t banner and dialog copy in a SvelteKit app, where the server prefetch carries the backend's translations for the request's language.
- [Troubleshooting](./frameworks/sveltekit/troubleshooting.md): Fix a banner missing from SvelteKit server HTML, failed saves through the manifest route, prerender build errors and ignored theme colors.

## Concepts

- [Choose your setup](./concepts/choose-your-setup.md): Pick the c15t setup for your framework, rendering mode and hosting, and decide who runs the consent backend.
- [Consent categories](./concepts/consent-categories.md): Assign scripts, embeds and features to c15t consent categories, and understand which categories the preference dialog shows.
- [Consent state reference](./concepts/consent-state.md): How c15t saves choices, gates IAB vendors, hydrates server records and keeps browser tabs and storage in step.
- [Data fetching](./concepts/data-fetching.md): How c15t gets policy data through a cached manifest, backend /init, the browser or offline rules, and where consent choices are saved.
- [How consent works](./concepts/how-consent-works.md): What c15t decides on each page load, the difference between a permission and a recorded choice, and what happens when a visitor saves.
- [Policies](./concepts/policies.md): How policy models, prompts and scope decide what c15t asks visitors, where to change the rules, and why a banner may not appear.

## Guides

- [Banner experiments](./guides/banner-experiments.md): Run A/B tests on consent banner presentation with any feature-flag provider or built-in weighted assignment, and attribute every impression and choice to its arm.
- [Troubleshooting](./guides/troubleshooting.md): Fix a missing banner, analytics that load before consent, choices lost on reload, CORS errors, hydration differences and failed static builds in c15t v3.
- [Verify consent](./guides/verify-consent.md): Check in a production build that vendor requests wait for consent, rejection survives a reload, preferences reopen and privacy signals apply.

## Customization

- [Class names and CSS-in-JS](./customization/class-names.md): Style c15t's component parts with CSS Modules, vanilla-extract, StyleX, Emotion or plain class names, and see which approach works in each framework.
- [Dark mode](./customization/dark-mode.md): Switch c15t's banner and dialog to dark colors with colorScheme, set your own dark tokens, follow your site's theme switch, and paint dark on the first frame in every framework.
- [Motion and animation](./customization/motion.md): Change how fast c15t's banner and dialog animate with duration and easing tokens, turn animations off per surface with disableAnimation, and check reduced-motion behavior in each framework.
- [Customization](./customization/overview.md): Change c15t's consent banner and dialog one step at a time, from a prop to your own markup, and find where each step lives in your framework.
- [Banner designs](./customization/recipes.md): Five consent banner designs built with c15t, from one prop to your own markup, with tested code for React, Vue, Svelte, Astro and plain HTML.
- [Component parts](./customization/slots.md): Find every part of c15t's banner, dialog, widget and trigger, its key in your framework's part API, and the data attributes to select on.
- [Stylesheets and CSS layers](./customization/stylesheets.md): Load the right c15t stylesheet for your framework, see when the dialog's CSS loads, order c15t's cascade layer against your own, and run c15t without its styles.
- [Tailwind CSS](./customization/tailwind.md): Load c15t's styles next to Tailwind CSS 4 or 3 in every framework, put utilities on c15t component parts, and use Tailwind's dark variant with c15t.
- [Theme tokens](./customization/tokens.md): Change c15t's colors, type, radius, spacing, shadows and motion with theme tokens, and see every --c15t-* variable with its default.
- [Copy and translations](./customization/translations.md): Change consent wording through i18n and test the complete prompt and preferences flow.

## Integrations

- [Adobe Analytics](./integrations/adobe-analytics.md): Load an Adobe Data Collection Tags property only after measurement consent with the c15t adobeAnalytics helper, and check its extensions in DevTools.
- [Ahrefs Analytics](./integrations/ahrefs-analytics.md): Load Ahrefs Web Analytics only after measurement consent with the c15t ahrefsAnalytics helper, and check it in DevTools.
- [Amplitude](./integrations/amplitude.md): Load the Amplitude Browser SDK 2 only after measurement consent with the c15t amplitude helper, which opts the SDK out on revocation and back in on a new grant.
- [Custom integrations](./integrations/building-integrations.md): Gate a vendor that has no @c15t/integrations helper, or sync consent with an SDK your app already loads, using a c15t script configuration.
- [Clear on revocation](./integrations/clear-on-revocation.md): Delete the first-party cookies and Web Storage keys a consent category owns when that category is denied, and check the deletion in DevTools.
- [Clearbit](./integrations/clearbit.md): Load the Clearbit enrichment tag only after marketing consent with the c15t clearbit helper, and check it in DevTools.
- [Cloudflare Web Analytics](./integrations/cloudflare-web-analytics.md): Load the Cloudflare Web Analytics beacon only after measurement consent with the c15t cloudflareWebAnalytics helper, and check it in DevTools.
- [Cloudflare Zaraz](./integrations/cloudflare-zaraz.md): Sync c15t permissions to Cloudflare Zaraz purposes with the c15t cloudflareZaraz bridge, which runs on every page without loading a script, and check the tools it controls.
- [Crisp](./integrations/crisp.md): Load the Crisp chat widget only after functionality consent with the c15t crisp helper, pass its runtime settings and check it in DevTools.
- [Databuddy](./integrations/databuddy.md): Load the Databuddy SDK on every page with the c15t databuddy helper, switch its disabled flag and config from measurement consent, and check both in DevTools.
- [Use c15t with an existing CMP](./integrations/existing-cmp.md): Keep your current consent platform for the banner and records, and let c15t load scripts from its decisions with a consentSource adapter.
- [Fathom Analytics](./integrations/fathom-analytics.md): Load Fathom Analytics only after measurement consent with the c15t fathomAnalytics helper, set its SPA mode, and check it in DevTools.
- [Front Chat](./integrations/front-chat.md): Load the Front Chat widget only after functionality consent with the c15t frontChat helper, forward CSP nonces, clear the session on revocation and check it in DevTools.
- [Google Maps](./integrations/google-maps.md): Gate a Google Maps iframe embed with c15t v3 so the map loads only after the visitor allows its consent category, in Next.js, TanStack Start, React, Nuxt, Vue, Astro, Svelte, SvelteKit, HTML or JavaScript.
- [Google Tag](./integrations/google-tag.md): Load gtag.js for Google Analytics or Google Ads with c15t Consent Mode v2 signals, and verify the consent commands in DevTools.
- [Google Tag Manager](./integrations/google-tag-manager.md): Load a Google Tag Manager container with c15t Consent Mode v2 signals, configure consent checks inside the container, and verify both in DevTools.
- [Let visitors turn off one vendor](./integrations/granular-consent.md): Declare vendors so a visitor can allow a category such as marketing and still switch off one vendor in it, without adopting IAB TCF.
- [Heap](./integrations/heap.md): Load the Heap config script and heap.js only after measurement consent with the c15t heap helper, and check it in DevTools.
- [Hightouch](./integrations/hightouch.md): Load the Hightouch Events browser SDK only after measurement consent with the c15t hightouch helper, and check page events in DevTools.
- [Hotjar](./integrations/hotjar.md): Load Hotjar only after measurement consent with the c15t hotjar helper, and check its loader and recordings in DevTools.
- [Intercom](./integrations/intercom.md): Load the Intercom messenger only after functionality consent with the c15t intercom helper, set its region and check it in DevTools.
- [LinkedIn Insight Tag](./integrations/linkedin-insights.md): Load the LinkedIn Insight Tag only after marketing consent with the c15t linkedinInsights helper, guard lintrk conversion calls, and check it in DevTools.
- [LogRocket](./integrations/logrocket.md): Load LogRocket session replay only after measurement consent with the c15t logRocket helper, including proxied setups, and check it in DevTools.
- [Matomo Analytics](./integrations/matomo-analytics.md): Load Matomo after measurement consent with the c15t matomoAnalytics helper, or use Matomo's own consent mode, and check each mode in DevTools.
- [Meta Pixel](./integrations/meta-pixel.md): Load the Meta Pixel only after marketing consent with the c15t metaPixel helper, guard fbq event calls, and check it in DevTools.
- [Microsoft Clarity](./integrations/microsoft-clarity.md): Load Microsoft Clarity only after measurement consent with the c15t clarity helper, send Consent V2 storage signals and check them in DevTools.
- [Microsoft UET](./integrations/microsoft-uet.md): Load Microsoft Advertising UET on every page with the c15t microsoftUet helper, send ad_storage consent defaults and updates, and verify both in DevTools.
- [Mixpanel](./integrations/mixpanel-analytics.md): Load the Mixpanel SDK on every page with the c15t mixpanelAnalytics helper, which switches Mixpanel tracking on and off with measurement consent, and check it in DevTools.
- [OneDollarStats](./integrations/one-dollar-stats.md): Load the OneDollarStats tracker only after measurement consent with the c15t oneDollarStats helper, forward its data-attribute settings, and check it in DevTools.
- [OpenAI Pixel](./integrations/openai-pixel.md): Load the ChatGPT Ads Measurement Pixel only after marketing consent with the c15t openaiPixel helper, guard oaiq conversion calls, and check it in DevTools.
- [Integrations](./integrations/overview.md): Find all c15t integrations for analytics, tag managers, advertising, chat and embedded content.
- [Pinterest Tag](./integrations/pinterest-tag.md): Load the Pinterest Tag only after marketing consent with the c15t pinterestTag helper, guard pintrk event calls, and check it in DevTools.
- [Pirsch](./integrations/pirsch.md): Load Pirsch Analytics only after measurement consent with the c15t pirsch helper, keep custom event bindings working, and check it in DevTools.
- [Plausible Analytics](./integrations/plausible-analytics.md): Load the Plausible Analytics tracker only after measurement consent with the c15t plausibleAnalytics helper, and check it in DevTools.
- [PostHog](./integrations/posthog.md): Load PostHog before or after measurement consent with the c15t posthog helper, choose its cookieless behavior, and sync consent with an SDK you already initialize.
- [Promptwatch](./integrations/promptwatch.md): Load the Promptwatch attribution client only after measurement consent with the c15t promptwatch helper, and check it in DevTools.
- [Reddit Pixel](./integrations/reddit-pixel.md): Load the Reddit Pixel only after marketing consent with the c15t redditPixel helper, guard rdt conversion calls, and check it in DevTools.
- [RudderStack](./integrations/rudderstack.md): Load the RudderStack JavaScript SDK after measurement consent with the c15t rudderstack helper, or map c15t categories to destination consent IDs, and check each mode.
- [Rybbit Analytics](./integrations/rybbit-analytics.md): Load Rybbit Analytics only after measurement consent with the c15t rybbitAnalytics helper, map its tracking options to data attributes, and check it in DevTools.
- [Segment](./integrations/segment.md): Load Segment Analytics.js only after measurement consent with the c15t segment helper, guard your own track and identify calls, and check it in DevTools.
- [Snapchat Pixel](./integrations/snapchat-pixel.md): Load the Snapchat Pixel only after marketing consent with the c15t snapchatPixel helper, guard snaptr event calls, and check it in DevTools.
- [TikTok Pixel](./integrations/tiktok-pixel.md): Load the TikTok Pixel only after marketing consent with the c15t tiktokPixel helper, guard ttq event calls, and check it in DevTools.
- [Umami Analytics](./integrations/umami-analytics.md): Load the Umami Analytics tracker only after measurement consent with the c15t umamiAnalytics helper, point it at a self-hosted instance, and check it in DevTools.
- [Vercel Analytics](./integrations/vercel-analytics.md): Load the Vercel Web Analytics script only after measurement consent with the c15t vercelAnalytics helper, choose the debug script, and check it in DevTools.
- [X Pixel](./integrations/x-pixel.md): Load the X Pixel only after marketing consent with the c15t xPixel helper, guard twq conversion events, and check it in DevTools.
- [YouTube](./integrations/youtube.md): Gate YouTube embeds with c15t v3 in Next.js, TanStack Start, React, Nuxt, Vue, Astro, Svelte, SvelteKit or JavaScript.

## Reference

- [Migrate to v3](./upgrade-v3.md): Upgrade a c15t v2 app to v3. Covers packages, the Next.js and React providers, the JavaScript runtime, custom UI built on useConsentManager, callbacks, policies, stored consent and a self-hosted backend.
