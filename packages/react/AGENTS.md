# @c15t/react

> React v3 consent components, hooks, Inth setup and customization.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Using these docs

These docs describe c15t v3. Find the app in Choose your setup, then follow that framework guide from start to finish; it names the files to create and the backend URL to use. Install c15t packages with the @alpha dist-tag, because npm latest is still v2. A visible banner does not prove anything: check that vendor requests wait for consent, that rejection survives a reload, and that preferences can be reopened.

## Start here

- [React quickstart](./docs/frameworks/react/quickstart.md)
- [Choose your setup](./docs/concepts/choose-your-setup.md): Pick the c15t setup for your framework, rendering mode and hosting, and decide who runs the consent backend.
- [How consent works](./docs/concepts/how-consent-works.md): What c15t decides on each page load, the difference between a permission and a recorded choice, and what happens when a visitor saves.
- [Customize your consent interface](./docs/customization/overview.md): Choose presentation, theme tokens, slots or custom markup for the change you need.
- [Verify consent before shipping](./docs/guides/verify-consent.md): Check in a production build that vendor requests wait for consent, rejection survives a reload, preferences reopen and privacy signals apply.
- [Migrate from v2 to v3](./docs/upgrade-v3.md): Upgrade a c15t v2 app to v3. Covers packages, the Next.js and React providers, the JavaScript runtime, custom UI built on useConsentManager, callbacks, policies, stored consent and a self-hosted backend.

## More documentation

[Documentation index](https://c15t.com/docs/llms.txt) · [Full Markdown context](https://c15t.com/llms-full.txt). Prefer the index and individual pages for focused tasks.

## Frameworks

- [ConsentBanner](./docs/frameworks/react/components/consent-banner.md): Render the c15t consent banner in a React app, choose its variant and position, and compose its parts.
- [ConsentDialog](./docs/frameworks/react/components/consent-dialog.md): Open the c15t preference center as a modal ConsentDialog in a React app, wire its triggers and control blocking, focus and policy gating.
- [ConsentDialogLink](./docs/frameworks/react/components/consent-dialog-link.md): Add a ConsentDialogLink to a React footer so visitors reopen the c15t preference center from your own text link, with asChild and rights data.
- [ConsentDialogTrigger](./docs/frameworks/react/components/consent-dialog-trigger.md): Floating button and toolbar that reopen the preference center after the first prompt.
- [ConsentGate](./docs/frameworks/react/components/consent-gate.md): Gate a YouTube or map iframe behind consent with ConsentGate in React, showing a placeholder that opens the preference center until the category is allowed.
- [ConsentProvider](./docs/frameworks/react/components/consent-manager-provider.md): Mount ConsentProvider in a React app and configure its backend, scripts, storage, blocking and presentation options.
- [ConsentWidget](./docs/frameworks/react/components/consent-widget.md): Embed the c15t preference center inline with ConsentWidget on a React privacy page, with draft toggles that record a choice only on Save.
- [DevTools](./docs/frameworks/react/components/dev-tools.md): Inspect consent state, location, loaded scripts and consent events in a React app during development with the c15t DevTools panel.
- [Customize](./docs/frameworks/react/customize.md): Change the colors, fonts, layout, button styles and copy of the c15t banner and dialog in a React app with the stylesheet, theme tokens, provider options and slots.
- [Headless](./docs/frameworks/react/headless.md): Build a custom consent banner in React with the c15t/react/headless hooks inside your ConsentProvider.
- [Hooks](./docs/frameworks/react/hooks/overview.md): Gate features and save consent choices in React components with the focused hooks exported from c15t/react.
- [IAB TCF](./docs/frameworks/react/iab/overview.md): Mount the IAB TCF banner and dialog inside a React ConsentProvider and configure the CMP ID, policy and vendor data.
- [Quickstart](./docs/frameworks/react/quickstart.md): Add a consent banner, preferences dialog and consent-gated scripts to a React single-page app built with Vite, using Inth as the consent backend.
- [Rendering](./docs/frameworks/react/rendering.md): How c15t resolves consent in client-rendered React apps, React Router framework mode, Remix and other server-rendered React apps without a c15t adapter.
- [Scripts and embeds](./docs/frameworks/react/scripts.md): Load vendor scripts, gate iframes, block network requests and clear stored data by consent category in a React app with ConsentProvider.
- [Troubleshooting](./docs/frameworks/react/troubleshooting.md): Fix a missing banner, early vendor requests, unstyled components and theme warnings in a React app that uses c15t/react.

## Concepts

- [Choose your setup](./docs/concepts/choose-your-setup.md): Pick the c15t setup for your framework, rendering mode and hosting, and decide who runs the consent backend.
- [Consent categories](./docs/concepts/consent-categories.md): Assign scripts, embeds and features to c15t consent categories, and understand which categories the preference dialog shows.
- [Consent state reference](./docs/concepts/consent-state.md): How c15t saves choices, gates IAB vendors, hydrates server records and keeps browser tabs and storage in step.
- [Data fetching](./docs/concepts/data-fetching.md): How c15t gets policy data through a cached manifest, backend /init, the browser or offline rules, and where consent choices are saved.
- [How consent works](./docs/concepts/how-consent-works.md): What c15t decides on each page load, the difference between a permission and a recorded choice, and what happens when a visitor saves.
- [Policies](./docs/concepts/policies.md): How policy models, prompts and scope decide what c15t asks visitors, where to change the rules, and why a banner may not appear.

## Guides

- [Troubleshooting](./docs/guides/troubleshooting.md): Fix a missing banner, analytics that load before consent, choices lost on reload, CORS errors, hydration differences and failed static builds in c15t v3.
- [Verify consent before shipping](./docs/guides/verify-consent.md): Check in a production build that vendor requests wait for consent, rejection survives a reload, preferences reopen and privacy signals apply.

## Customization

- [Customize your consent interface](./docs/customization/overview.md): Choose presentation, theme tokens, slots or custom markup for the change you need.
- [Banner styling recipes](./docs/customization/recipes.md): See real v3 components and reuse the exact theme configuration behind the examples.
- [Style component slots](./docs/customization/slots.md): Target a specific c15t component part without replacing its markup or behavior.
- [Theme tokens and CSS](./docs/customization/tokens.md): Style c15t with semantic tokens and use the stylesheet that matches your CSS tooling.
- [Copy and translations](./docs/customization/translations.md): Change consent wording through i18n and test the complete prompt and preferences flow.

## Integrations

- [Adobe Analytics](./docs/integrations/adobe-analytics.md): Load an Adobe Data Collection Tags property only after measurement consent with the c15t adobeAnalytics helper, and check its extensions in DevTools.
- [Ahrefs Analytics](./docs/integrations/ahrefs-analytics.md): Load Ahrefs Web Analytics only after measurement consent with the c15t ahrefsAnalytics helper, and check it in DevTools.
- [Amplitude](./docs/integrations/amplitude.md): Load the Amplitude Browser SDK 2 only after measurement consent with the c15t amplitude helper, which opts the SDK out on revocation.
- [Custom integrations](./docs/integrations/building-integrations.md): Gate a vendor that has no @c15t/scripts helper, or sync consent with an SDK your app already loads, using a c15t script configuration.
- [Clear on revocation](./docs/integrations/clear-on-revocation.md): Delete the first-party cookies and Web Storage keys a consent category owns when that category is denied, and check the deletion in DevTools.
- [Clearbit](./docs/integrations/clearbit.md): Load the Clearbit enrichment tag only after marketing consent with the c15t clearbit helper, and check it in DevTools.
- [Cloudflare Web Analytics](./docs/integrations/cloudflare-web-analytics.md): Load the Cloudflare Web Analytics beacon only after measurement consent with the c15t cloudflareWebAnalytics helper, and check it in DevTools.
- [Cloudflare Zaraz](./docs/integrations/cloudflare-zaraz.md): Sync c15t permissions to Cloudflare Zaraz purposes with the c15t cloudflareZaraz bridge, which runs on every page without loading a script, and check the tools it controls.
- [Crisp](./docs/integrations/crisp.md): Load the Crisp chat widget only after functionality consent with the c15t crisp helper, pass its runtime settings and check it in DevTools.
- [Databuddy](./docs/integrations/databuddy.md): Load the Databuddy SDK on every page with the c15t databuddy helper, switch its disabled flag and config from measurement consent, and check both in DevTools.
- [Use c15t with an existing CMP](./docs/integrations/existing-cmp.md): Keep your current consent platform for the banner and records, and let c15t load scripts from its decisions with a consentSource adapter.
- [Fathom Analytics](./docs/integrations/fathom-analytics.md): Load Fathom Analytics only after measurement consent with the c15t fathomAnalytics helper, set its SPA mode, and check it in DevTools.
- [Front Chat](./docs/integrations/front-chat.md): Load the Front Chat widget only after functionality consent with the c15t frontChat helper, forward CSP nonces, clear the session on revocation and check it in DevTools.
- [Google Maps](./docs/integrations/google-maps.md): Prevent a map iframe from mounting before the required permission.
- [Google Tag](./docs/integrations/google-tag.md): Load gtag.js for Google Analytics or Google Ads with c15t Consent Mode v2 signals, and verify the consent commands in DevTools.
- [Google Tag Manager](./docs/integrations/google-tag-manager.md): Load a Google Tag Manager container with c15t Consent Mode v2 signals, configure consent checks inside the container, and verify both in DevTools.
- [Let visitors turn off one vendor](./docs/integrations/granular-consent.md): Declare vendors so a visitor can allow a category such as marketing and still switch off one vendor in it, without adopting IAB TCF.
- [Heap](./docs/integrations/heap.md): Load the Heap config script and heap.js only after measurement consent with the c15t heap helper, and check it in DevTools.
- [Hightouch](./docs/integrations/hightouch.md): Load the Hightouch Events browser SDK only after measurement consent with the c15t hightouch helper, and check page events in DevTools.
- [Hotjar](./docs/integrations/hotjar.md): Load Hotjar only after measurement consent with the c15t hotjar helper, and check its loader and recordings in DevTools.
- [Intercom](./docs/integrations/intercom.md): Load the Intercom messenger only after functionality consent with the c15t intercom helper, set its region and check it in DevTools.
- [LinkedIn Insight Tag](./docs/integrations/linkedin-insights.md): Load the LinkedIn Insight Tag only after marketing consent with the c15t linkedinInsights helper, guard lintrk conversion calls, and check it in DevTools.
- [LogRocket](./docs/integrations/logrocket.md): Load LogRocket session replay only after measurement consent with the c15t logRocket helper, including proxied setups, and check it in DevTools.
- [Matomo Analytics](./docs/integrations/matomo-analytics.md): Load Matomo after measurement consent with the c15t matomoAnalytics helper, or use Matomo's own consent mode, and check each mode in DevTools.
- [Meta Pixel](./docs/integrations/meta-pixel.md): Load the Meta Pixel only after marketing consent with the c15t metaPixel helper, guard fbq event calls, and check it in DevTools.
- [Microsoft Clarity](./docs/integrations/microsoft-clarity.md): Load Microsoft Clarity only after measurement consent with the c15t clarity helper, send Consent V2 storage signals and check them in DevTools.
- [Microsoft UET](./docs/integrations/microsoft-uet.md): Load Microsoft Advertising UET on every page with the c15t microsoftUet helper, send ad_storage consent defaults and updates, and verify both in DevTools.
- [Mixpanel](./docs/integrations/mixpanel-analytics.md): Load the Mixpanel SDK on every page with the c15t mixpanelAnalytics helper, which switches Mixpanel tracking on and off with measurement consent, and check it in DevTools.
- [OneDollarStats](./docs/integrations/one-dollar-stats.md): Load the OneDollarStats tracker only after measurement consent with the c15t oneDollarStats helper, forward its data-attribute settings, and check it in DevTools.
- [OpenAI Pixel](./docs/integrations/openai-pixel.md): Load the ChatGPT Ads Measurement Pixel only after marketing consent with the c15t openaiPixel helper, guard oaiq conversion calls, and check it in DevTools.
- [Overview](./docs/integrations/overview.md): Find all c15t integrations for analytics, tag managers, advertising, chat and embedded content.
- [Pinterest Tag](./docs/integrations/pinterest-tag.md): Load the Pinterest Tag only after marketing consent with the c15t pinterestTag helper, guard pintrk event calls, and check it in DevTools.
- [Pirsch](./docs/integrations/pirsch.md): Load Pirsch Analytics only after measurement consent with the c15t pirsch helper, keep custom event bindings working, and check it in DevTools.
- [Plausible Analytics](./docs/integrations/plausible-analytics.md): Load the Plausible Analytics tracker only after measurement consent with the c15t plausibleAnalytics helper, and check it in DevTools.
- [PostHog](./docs/integrations/posthog.md): Load PostHog before or after measurement consent with the c15t posthog helper, choose its cookieless behavior, and sync consent with an SDK you already initialize.
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

- [Migrate from v2 to v3](./docs/upgrade-v3.md): Upgrade a c15t v2 app to v3. Covers packages, the Next.js and React providers, the JavaScript runtime, custom UI built on useConsentManager, callbacks, policies, stored consent and a self-hosted backend.
