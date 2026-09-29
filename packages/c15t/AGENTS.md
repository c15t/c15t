# c15t

> c15t v3 framework integration and consent management. Install c15t and use its framework subpaths; adapters and add-ons absent from its exports use separate packages.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Using these docs

These docs describe c15t v3. Find the app in Choose your setup, then follow that framework guide from start to finish; it names the files to create and the backend URL to use. Install c15t packages with the @alpha dist-tag, because npm latest is still v2. A visible banner does not prove anything: check that vendor requests wait for consent, that rejection survives a reload, and that preferences can be reopened.

## Start here

- [Choose your framework](./docs/frameworks/index.md)
- [Choose your setup](./docs/concepts/choose-your-setup.md): Pick the c15t setup for your framework, rendering mode and hosting, and decide who runs the consent backend.
- [How consent works](./docs/concepts/how-consent-works.md): What c15t decides on each page load, the difference between a permission and a recorded choice, and what happens when a visitor saves.
- [Customize your consent interface](./docs/customization/overview.md): Choose presentation, theme tokens, slots or custom markup for the change you need.
- [Verify consent before shipping](./docs/guides/verify-consent.md): Check in a production build that vendor requests wait for consent, rejection survives a reload, preferences reopen and privacy signals apply.
- [Migrate from v2 to v3](./docs/upgrade-v3.md): Upgrade a c15t v2 app to v3. Covers packages, the Next.js and React providers, the JavaScript runtime, custom UI built on useConsentManager, callbacks, policies, stored consent and a self-hosted backend.

## More documentation

[Documentation index](https://c15t.com/docs/llms.txt) · [Full Markdown context](https://c15t.com/llms-full.txt). Prefer the index and individual pages for focused tasks.

## Frameworks

- [Frameworks](./docs/frameworks/index.md): c15t setup guides for Next.js, TanStack Start, React, Nuxt, Vue, Astro, Svelte, SvelteKit, plain HTML, JavaScript and React Native.
- [Client API](./docs/frameworks/astro/client-api.md): Read and change consent on an Astro site, from Astro.locals.c15t on the server to getConsentClient() in browser scripts, with preferences, saves, framework islands, external consent sources and analytics events.
- [Components](./docs/frameworks/astro/components.md): Props and rendered output of every c15t Astro component, from ConsentScript and ConsentBanner to the preference dialog, its trigger, the server island banner and the IAB TCF surfaces.
- [Customize](./docs/frameworks/astro/customize.md): Change the c15t banner and preference dialog on an Astro site with theme tokens, button styles, copy, dark mode, legal links and your own stylesheet order, all from the integration options.
- [IAB TCF](./docs/frameworks/astro/iab.md): Render the IAB TCF 2.4 banner and preference center on an Astro site with the c15t integration, and configure the CMP ID, vendor list source and publisher restrictions.
- [Quickstart](./docs/frameworks/astro/quickstart.md): Add a c15t consent banner, preference dialog and consent-gated scripts to an Astro 5, 6 or 7 site with the c15t integration and Inth, on static or server output.
- [Rendering and deployment](./docs/frameworks/astro/rendering.md): Choose how c15t resolves consent on an Astro site, from static output with hosted mode to server output with manifest mode, prerendered pages, server islands, ClientRouter and offline development.
- [Scripts and embeds](./docs/frameworks/astro/scripts.md): Load vendor scripts, inline scripts, iframes and fetch requests on an Astro site only after the visitor allows their consent category, and stop them when consent is withdrawn.
- [Troubleshooting](./docs/frameworks/astro/troubleshooting.md): Fix common c15t problems on Astro sites, from build errors about adapters and UI integrations to a missing banner, scripts that run too early, unstyled dialogs and saves that fail.
- [window.c15t API](./docs/frameworks/html/api.md): Reference for window.c15t on a plain HTML page, covering the call queue, manual start, reading permissions and recorded choices, saving choices, opening the banner and dialog, and properties.
- [Attributes and API](./docs/frameworks/html/attributes-and-api.md): Reference for the c15t script tag on plain HTML pages, covering the bundle files, every data attribute on the script tag, the DevTools tag and your own markup, and the modes the attributes select.
- [Events and callbacks](./docs/frameworks/html/callbacks.md): Run code on a plain HTML page when c15t resolves the policy, when a visitor records a choice, when permissions change or when a request fails, with window.c15t events, DOM events and config callbacks.
- [Components](./docs/frameworks/html/components.md): Every consent surface and page hook the c15t script tag gives a plain HTML site, from the stock banner and preference dialog to data-c15t-action buttons and gated scripts and iframes.
- [Action buttons](./docs/frameworks/html/components/action-buttons.md): Make your own HTML buttons accept, reject, open preferences, dismiss a notice or reopen the banner with the data-c15t-action attribute and the c15t script tag, with no JavaScript.
- [Banner](./docs/frameworks/html/components/banner.md): The stock consent banner the c15t script tag shows on a plain HTML site, with its options, layouts, policy-driven buttons, keyboard behavior and data-testid styling hooks.
- [Preference dialog](./docs/frameworks/html/components/dialog.md): The stock c15t preference dialog on a plain HTML site, where visitors change each consent category, with how it opens, which categories it lists, its options, keyboard behavior and styling hooks.
- [Gated scripts](./docs/frameworks/html/components/gated-script.md): Hold a vendor's script tag on a plain HTML page until its consent category is allowed with type="text/plain" and data-c15t-category, including load order, copied attributes and what happens on withdrawal.
- [Preferences link](./docs/frameworks/html/components/preferences-link.md): Let visitors reopen c15t privacy settings on a plain HTML site from a footer link, a CMS menu item or a page builder link to the c15t-preferences fragment, with no JavaScript.
- [Floating trigger](./docs/frameworks/html/components/trigger.md): Add the c15t floating button that reopens the preference dialog on a plain HTML site, and set its corner, size, visibility and accessible name.
- [Configuration](./docs/frameworks/html/configuration.md): Every option you can pass to the c15t script tag on a plain HTML page through a queued config call, including scripts with callbacks, the network blocker, theme tokens, presentation, translations and storage.
- [Content Security Policy](./docs/frameworks/html/content-security-policy.md): Allow the c15t script tag, its stylesheet, backend requests, gated scripts and embeds under a Content Security Policy on a plain HTML site, with nonces or allowed origins.
- [Customize](./docs/frameworks/html/customize.md): Change the c15t script tag banner on a plain HTML site with theme tokens, extra CSS, layout, copy and legal links, or replace it with your own HTML.
- [DevTools](./docs/frameworks/html/dev-tools.md): Add the c15t DevTools panel to a plain HTML page with a second script tag to inspect consent, gated scripts, the resolved policy and events, and to test other countries.
- [Embeds](./docs/frameworks/html/embeds.md): Hold YouTube videos, maps and other iframes on a plain HTML page until their consent category is allowed with data-src and data-category, show a placeholder, and configure the c15t iframe blocker.
- [Headless](./docs/frameworks/html/headless.md): Render your own consent banner and preferences in plain HTML with c15t.headless.js, the ui event and data-c15t-action buttons, while c15t keeps resolving the policy, storing choices and gating scripts.
- [IAB TCF](./docs/frameworks/html/iab.md): Load the c15t IAB TCF build on a plain HTML page with one script tag, configure the CMP ID and vendors, and confirm TC strings from your own code.
- [Network blocker](./docs/frameworks/html/network-blocker.md): Hold fetch and XMLHttpRequest calls from a plain HTML page until their consent category is allowed, with network blocker rules queued on the c15t script tag.
- [Install on your platform](./docs/frameworks/html/platforms.md): Where to paste the c15t script tag, gated vendor snippets and the privacy settings link in WordPress, Webflow, Shopify, Squarespace, Wix, Framer, Ghost, Hugo, Eleventy and Jekyll.
- [Quickstart](./docs/frameworks/html/quickstart.md): Add the c15t banner, preferences and script gating to a plain HTML site, CMS theme, page builder or static site generator with one script tag and no build step.
- [Scripts](./docs/frameworks/html/scripts.md): Hold vendor scripts on a plain HTML page until the visitor allows their category, load scripts with callbacks, handle withdrawal and clear vendor cookies with the c15t script tag and no build step.
- [Translations](./docs/frameworks/html/translations.md): Choose the language of the c15t banner and preference dialog on a plain HTML site, change its wording, and add languages in hosted and offline mode with the script tag.
- [Troubleshooting](./docs/frameworks/html/troubleshooting.md): Fix a missing banner, vendor scripts that run before consent, script tag errors and blocked requests on a plain HTML site that uses the c15t script tag.
- [@c15t/browser API](./docs/frameworks/javascript/api/browser.md): Reference for the @c15t/browser ES module in a bundled JavaScript app, covering its entry points, init and createConsentClient, the client's methods and properties, events, page hooks and helper exports.
- [@c15t/browser options](./docs/frameworks/javascript/api/browser-options.md): Every option init() and createConsentClient() from @c15t/browser accept in a bundled JavaScript app, from the backend URL and mode to scripts, blockers, callbacks, storage, presentation and the stock UI.
- [Consent kernel API](./docs/frameworks/javascript/api/overview.md): Reference for the c15t consent kernel in JavaScript, covering how to get or create one, its snapshot and subscriptions, commands, setters, hydration, events and listener ordering.
- [createConsentRuntime](./docs/frameworks/javascript/api/runtime.md): Reference for createConsentRuntime from c15t/runtime, the framework-agnostic consent runtime behind every c15t adapter, with every option, what start and dispose do, and the runtime handle's methods.
- [Consent snapshot](./docs/frameworks/javascript/api/snapshot.md): Reference for every field of the c15t consent snapshot a JavaScript app reads from the kernel, @c15t/browser or createConsentRuntime, grouped by the question each field answers.
- [Callbacks](./docs/frameworks/javascript/callbacks.md): Run code in a JavaScript app when a visitor records a consent choice, when permissions change, when a request fails or before the withdrawal reload, with c15t callbacks, client events and kernel events.
- [Content Security Policy](./docs/frameworks/javascript/content-security-policy.md): Allow c15t in a JavaScript app under a Content Security Policy, covering backend requests, the stock UI's styles, nonces for vendor scripts and gated snippets, and embeds.
- [Customize](./docs/frameworks/javascript/customize.md): Change the stock @c15t/browser banner, preference dialog and floating trigger in a bundled JavaScript app with theme tokens, CSS, layout, copy, legal links and UI options.
- [DevTools](./docs/frameworks/javascript/dev-tools.md): Mount the c15t DevTools panel in a JavaScript app to inspect consent, scripts, policy and events for @c15t/browser, a consent runtime or a kernel.
- [Headless](./docs/frameworks/javascript/headless.md): Render your own consent banner and preferences in JavaScript, or connect a framework without a c15t adapter such as Solid, with createConsentRuntime from c15t/runtime.
- [IAB TCF](./docs/frameworks/javascript/iab/overview.md): Add IAB TCF to a JavaScript app with the @c15t/browser IAB build, or attach the IAB module to a consent runtime or kernel you own.
- [Clear on revocation](./docs/frameworks/javascript/modules/clear-on-revocation.md): Delete vendor cookies and storage keys in a JavaScript app when a visitor denies or withdraws their consent category, with clearOnRevocation or createClearOnRevocation on your own kernel.
- [Iframe blocker](./docs/frameworks/javascript/modules/iframe-blocker.md): Hold YouTube videos, maps and other embeds in a JavaScript app until their consent category is allowed, with data-src iframes and the c15t iframe blocker in @c15t/browser, createConsentRuntime or your own kernel.
- [Network blocker](./docs/frameworks/javascript/modules/network-blocker.md): Hold fetch and XMLHttpRequest calls in a JavaScript app until their consent category is allowed, with networkBlocker rules in @c15t/browser or createConsentRuntime, or createNetworkBlocker on your own kernel.
- [Persistence](./docs/frameworks/javascript/modules/persistence.md): How c15t stores consent choices in a JavaScript app, with the storage key, cookie domain and lifetime options, multi-tab sync, reconcile and clear, and createPersistence for your own kernel.
- [Script loader](./docs/frameworks/javascript/modules/script-loader.md): Reference for the c15t script loader in JavaScript, covering every Script field, lifecycle callbacks, updateScripts, disposal and createScriptLoader for a kernel you own.
- [Quickstart](./docs/frameworks/javascript/quickstart.md): Add the stock c15t banner, preferences and script gating to a JavaScript app built with Vite or another bundler, with no UI framework, using @c15t/browser.
- [Scripts](./docs/frameworks/javascript/scripts.md): Register vendor scripts with @c15t/browser, createConsentRuntime or a consent kernel in JavaScript, and control what happens when a visitor withdraws permission.
- [Translations](./docs/frameworks/javascript/translations.md): Choose the language of the c15t banner and preference dialog in a JavaScript app, change its wording with i18n, and add languages with @c15t/browser or createConsentRuntime.
- [Transports](./docs/frameworks/javascript/transports.md): Choose where a JavaScript app's c15t policy comes from and where choices go, with the hosted, manifest, offline and custom transports for @c15t/browser, createConsentRuntime and your own kernel.
- [Troubleshooting](./docs/frameworks/javascript/troubleshooting.md): Diagnose a missing banner, vendor scripts that run early, duplicate consent owners and policy resolution in a JavaScript app that uses @c15t/browser or c15t/runtime.
- [Fetching reference](./docs/frameworks/next/api-reference/data-fetching.md): Reference for Next.js consent URLs, manifest resolution, request geography and offline configuration.
- [App Router](./docs/frameworks/next/app-router.md): Set up c15t in the Next.js App Router with Inth, a cached policy manifest, consent-gated scripts and a streamed or awaited root layout.
- [Client-side initialization](./docs/frameworks/next/client-side.md): Initialize c15t in the browser in a Next.js app with one backend URL, without server prefetch, a manifest route or API handlers.
- [ConsentBanner](./docs/frameworks/next/components/consent-banner.md): Render the pre-built ConsentBanner inside a Next.js ConsentRoot and configure its variants, per-policy buttons and compound parts.
- [ConsentDialog](./docs/frameworks/next/components/consent-dialog.md): Mount ConsentDialog as a Client Component inside a Next.js ConsentRoot to open the preference center from the banner, links and triggers.
- [ConsentDialogLink](./docs/frameworks/next/components/consent-dialog-link.md): Open the preference center from a Next.js footer with ConsentDialogLink, a Client Component that renders an unstyled button inside ConsentRoot.
- [ConsentDialogTrigger](./docs/frameworks/next/components/consent-dialog-trigger.md): Add the floating ConsentDialogTrigger button or toolbar to a Next.js ConsentRoot so visitors can reopen the preference center.
- [ConsentGate](./docs/frameworks/next/components/consent-gate.md): Consent-gate an iframe in Next.js with ConsentGate inside ConsentRoot; with server prefetch the server HTML carries the placeholder for a denied category, and a granted embed mounts after hydration.
- [ConsentRoot](./docs/frameworks/next/components/consent-manager-provider.md): Pass server-resolved consent state and shared configuration to the Next.js ConsentRoot.
- [ConsentWidget](./docs/frameworks/next/components/consent-widget.md): Render ConsentWidget on a Next.js privacy page inside ConsentRoot as an inline preference center, server-rendered when the route resolves consent.
- [DevTools](./docs/frameworks/next/components/dev-tools.md): Load the c15t DevTools panel only in Next.js development builds to inspect consent state, scripts, policy and events inside ConsentRoot.
- [Content Security Policy](./docs/frameworks/next/content-security-policy.md): Pass a per-request CSP nonce to ConsentRoot in Next.js and allow the consent backend in connect-src.
- [Customize](./docs/frameworks/next/customize.md): Load the c15t stylesheet in Next.js and change colors, radius, button roles, slots and banner shape with ConsentTheme and ConsentRoot options.
- [Forward geography headers](./docs/frameworks/next/geography-headers.md): Use c15tProxy in Next.js proxy.ts or middleware.ts so Server Components and Route Handlers receive the visitor's country and region.
- [Headless](./docs/frameworks/next/headless.md): Build a custom consent banner in Next.js with the c15t/next/headless hooks inside your existing ConsentRoot.
- [Hooks](./docs/frameworks/next/hooks/overview.md): Gate features and save consent choices in Next.js Client Components with the focused hooks exported from c15t/next.
- [IAB TCF](./docs/frameworks/next/iab/overview.md): Mount the IAB TCF banner and dialog inside a Next.js ConsentRoot and configure the CMP ID, policy and vendor data.
- [Optimization](./docs/frameworks/next/optimization.md): Reuse cached policy data and optionally reduce browser connection overhead without changing consent behavior.
- [Pages Router](./docs/frameworks/next/pages-router.md): Set up c15t in the Next.js Pages Router with Inth, a cached policy manifest, getServerSideProps and consent-gated scripts.
- [Quickstart](./docs/frameworks/next/quickstart.md): Add c15t consent management to Next.js with Inth. Pick the guide for the App Router, the Pages Router or a static export.
- [Rendering and deployment](./docs/frameworks/next/rendering.md): Choose how Next.js resolves consent for your router, rendering mode and hosting, from streamed App Router layouts to static export, ISR and Cache Components.
- [Scripts and embeds](./docs/frameworks/next/scripts.md): Register vendor scripts, gate embeds, block network requests and handle revocation in a Next.js ConsentRoot.
- [Static export](./docs/frameworks/next/static-export.md): Add c15t to a Next.js site built with output export, where the browser resolves consent through Inth without request helpers or API routes.
- [Troubleshoot Next.js consent](./docs/frameworks/next/troubleshooting.md): Diagnose failed Next.js prefetch, verify manifest requests, and fix consent rendering or persistence problems.
- [Components](./docs/frameworks/nuxt/components.md): Every c15t component available in Nuxt, which ones the Nuxt module registers globally, their props and what they render.
- [Composables](./docs/frameworks/nuxt/composables.md): Read consent, open preferences and record choices in Nuxt with the composables the c15t Nuxt module auto-imports.
- [Customize](./docs/frameworks/nuxt/customize.md): Change the c15t banner and dialog in Nuxt with theme tokens, layout presentation, component slots and copy.
- [Headless](./docs/frameworks/nuxt/headless.md): Build your own consent banner and preference form in Nuxt with the auto-imported c15t composables instead of ConsentRoot.
- [IAB TCF](./docs/frameworks/nuxt/iab.md): Show the IAB TCF banner and preference centre in Nuxt with the c15t Nuxt module when your Inth policy uses the IAB model.
- [Quickstart](./docs/frameworks/nuxt/quickstart.md): Add c15t to a server-rendered Nuxt app with the Nuxt module, Inth, consent-gated scripts and a preferences link.
- [Rendering and deployment](./docs/frameworks/nuxt/rendering.md): Choose the c15t Nuxt module setup for server rendering, prerendered and cached routes, nuxt generate on static hosting, and ssr false.
- [Scripts and embeds](./docs/frameworks/nuxt/scripts.md): Load vendor scripts, gate iframes and block tracking requests by consent category in a Nuxt app with the c15t Nuxt module.
- [Troubleshooting](./docs/frameworks/nuxt/troubleshooting.md): Fix common c15t Nuxt module problems, from a missing banner and scripts that never load to returning banners and static hosting.
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
- [Components](./docs/frameworks/svelte/components.md): Props and behavior of every @c15t/svelte component in a Svelte app, from ConsentManagerProvider and ConsentBanner to ConsentGate and DevTools.
- [Customize](./docs/frameworks/svelte/customize.md): Change c15t's colors, shape, button styles and copy in a Svelte app with a token stylesheet, theme slots, presentation props and translations.
- [Context getters](./docs/frameworks/svelte/getters.md): Read permissions and recorded choices, open preferences and save consent from your own Svelte components with getConsentManager and the other context getters.
- [Headless](./docs/frameworks/svelte/headless.md): Replace the c15t banner or preference dialog with your own Svelte markup while the provider keeps policy, storage and script loading.
- [IAB TCF](./docs/frameworks/svelte/iab.md): Turn on the IAB TCF 2.4 banner and preference center in a Svelte app with IABConsentBanner, IABConsentDialog and the provider's iab option.
- [Quickstart](./docs/frameworks/svelte/quickstart.md): Add a c15t cookie banner, preference dialog and consent-gated scripts to a Svelte 5 app built with Vite, using Inth for policies and consent records.
- [Scripts and embeds](./docs/frameworks/svelte/scripts.md): Load vendor scripts, iframes and network requests in a Svelte app only after the visitor allows their consent category, and stop them when consent is withdrawn.
- [Troubleshooting](./docs/frameworks/svelte/troubleshooting.md): Fix a missing banner, an unset backend URL, ignored theme colors and vendors that load before consent in a Svelte app.
- [Components](./docs/frameworks/sveltekit/components.md): Props and behavior of every @c15t/svelte component in a SvelteKit app, from ConsentManagerProvider and ConsentBanner to ConsentGate and DevTools.
- [Customize](./docs/frameworks/sveltekit/customize.md): Render c15t brand colors on the SvelteKit server with generateThemeCSS, and change slots, button styles, banner shape and copy.
- [Context getters](./docs/frameworks/sveltekit/getters.md): Read permissions and recorded choices, open preferences and save consent from SvelteKit components with getConsentManager and the other context getters.
- [Headless](./docs/frameworks/sveltekit/headless.md): Replace the c15t banner or preference dialog with your own markup in a SvelteKit app while the provider keeps policy, storage and script loading.
- [IAB TCF](./docs/frameworks/sveltekit/iab.md): Turn on the IAB TCF 2.4 banner and preference center in a SvelteKit app with IABConsentBanner, IABConsentDialog and the provider's iab option.
- [Quickstart](./docs/frameworks/sveltekit/quickstart.md): Resolve consent in a SvelteKit root layout load so the c15t banner is in the server HTML, then hydrate the provider with consent-gated scripts and a preferences link.
- [Rendering and deployment](./docs/frameworks/sveltekit/rendering.md): Choose how a SvelteKit app resolves consent, on each request, from a cached manifest, or in the browser for prerendered pages, static sites and SPA mode, and deploy it to Node or edge adapters.
- [Scripts and embeds](./docs/frameworks/sveltekit/scripts.md): Load vendor scripts, iframes and network requests in a SvelteKit app only after the visitor allows their consent category, and stop them when consent is withdrawn.
- [Troubleshooting](./docs/frameworks/sveltekit/troubleshooting.md): Fix a banner missing from SvelteKit server HTML, failed saves through the manifest route, prerender build errors and ignored theme colors.
- [Components](./docs/frameworks/tanstack-start/components.md): ConsentRoot and the consent banner, dialog, widget, links, gate and DevTools components a TanStack Start app imports from c15t/tanstack-start.
- [ConsentBanner](./docs/frameworks/tanstack-start/components/consent-banner.md): Render the c15t consent banner in a TanStack Start app, set its variant and position, and override its labels.
- [ConsentDialog](./docs/frameworks/tanstack-start/components/consent-dialog.md): Open the c15t preference dialog in a TanStack Start app, reopen it from your own controls, and control blocking, focus and policy gating.
- [ConsentDialogLink](./docs/frameworks/tanstack-start/components/consent-dialog-link.md): Add a ConsentDialogLink to a TanStack Start footer so visitors can reopen the c15t preference dialog from your own text link.
- [ConsentDialogTrigger](./docs/frameworks/tanstack-start/components/consent-dialog-trigger.md): Add a floating button or toolbar to a TanStack Start app that reopens the c15t preference dialog after the first prompt.
- [ConsentGate](./docs/frameworks/tanstack-start/components/consent-gate.md): Gate a YouTube video, map or other iframe behind consent in a TanStack Start app with ConsentGate, showing a placeholder until the category is allowed.
- [ConsentWidget](./docs/frameworks/tanstack-start/components/consent-widget.md): Embed the c15t preference controls inline on a TanStack Start privacy page with ConsentWidget, recording a choice only when the visitor saves.
- [DevTools](./docs/frameworks/tanstack-start/components/dev-tools.md): Inspect consent state, location, loaded scripts and consent events in a TanStack Start app during development, on its own or inside TanStack Devtools.
- [Customize](./docs/frameworks/tanstack-start/customize.md): Change the colors, fonts, layout, button styles and copy of the c15t banner and dialog in a TanStack Start app with the stylesheet, theme tokens, ConsentRoot options and slots.
- [Headless](./docs/frameworks/tanstack-start/headless.md): Build your own consent banner markup in a TanStack Start app with the c15t/tanstack-start/headless hooks inside ConsentRoot.
- [Hooks](./docs/frameworks/tanstack-start/hooks.md): Read consent permissions, open the preference dialog and save choices in TanStack Start components with the hooks exported from c15t/tanstack-start.
- [IAB TCF](./docs/frameworks/tanstack-start/iab.md): Show the IAB TCF banner and dialog in a TanStack Start app for visitors whose policy uses the IAB model, with c15t/react/iab inside ConsentRoot.
- [Quickstart](./docs/frameworks/tanstack-start/quickstart.md): Resolve consent on the server in a TanStack Start root loader, render the banner in the first HTML, and gate vendor scripts, using Inth as the consent backend.
- [Rendering](./docs/frameworks/tanstack-start/rendering.md): Choose how a TanStack Start app resolves consent, with an awaited or streamed root loader, a same-origin consent route, or SPA mode, prerendered pages and static hosting.
- [Scripts and embeds](./docs/frameworks/tanstack-start/scripts.md): Load vendor scripts, gate iframes, block network requests and clear stored data by consent category in a TanStack Start app with ConsentRoot.
- [Troubleshooting](./docs/frameworks/tanstack-start/troubleshooting.md): Fix a missing server-rendered banner, server function errors, proxy and firewall failures, and early vendor requests in a TanStack Start app that uses c15t.
- [Components](./docs/frameworks/vue/components.md): Every c15t Vue component, its import path, props and what it renders, plus DevTools for debugging consent in a Vue app.
- [Composables](./docs/frameworks/vue/composables.md): Read consent, open preferences and record choices in a Vue app with the composables exported from c15t/vue/vue-plugin.
- [Customize](./docs/frameworks/vue/customize.md): Change the c15t banner and dialog in a Vue app with theme tokens, layout presentation, component slots and copy.
- [Headless](./docs/frameworks/vue/headless.md): Build your own consent banner and preference form in a Vue app with the c15t composables instead of ConsentRoot.
- [IAB TCF](./docs/frameworks/vue/iab.md): Show the IAB TCF banner and preference centre in a Vue app with the c15t Vue plugin when your Inth policy uses the IAB model.
- [Quickstart](./docs/frameworks/vue/quickstart.md): Add c15t to a Vue 3 app built with Vite, using the Vue plugin, Inth, consent-gated scripts and a preferences link.
- [Rendering and deployment](./docs/frameworks/vue/rendering.md): How the c15t Vue plugin resolves consent in the browser, how to host it statically, and why server-rendered Vue apps should use Nuxt.
- [Scripts and embeds](./docs/frameworks/vue/scripts.md): Load vendor scripts, gate iframes and block tracking requests by consent category in a Vue app with the c15t Vue plugin.
- [Troubleshooting](./docs/frameworks/vue/troubleshooting.md): Fix common c15t Vue plugin problems, from unresolved imports and a missing banner to tokens that do not apply and scripts that load twice.

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
- [Banner designs](./docs/customization/recipes.md): Five consent banner designs built with c15t, from one prop to your own markup, with tested code for React, Vue, Svelte, Astro and plain HTML.
- [Style component slots](./docs/customization/slots.md): Target a specific c15t component part without replacing its markup or behavior.
- [Theme tokens and CSS](./docs/customization/tokens.md): Style c15t with semantic tokens and use the stylesheet that matches your CSS tooling.
- [Copy and translations](./docs/customization/translations.md): Change consent wording through i18n and test the complete prompt and preferences flow.

## Integrations

- [Adobe Analytics](./docs/integrations/adobe-analytics.md): Load an Adobe Data Collection Tags property only after measurement consent with the c15t adobeAnalytics helper, and check its extensions in DevTools.
- [Ahrefs Analytics](./docs/integrations/ahrefs-analytics.md): Load Ahrefs Web Analytics only after measurement consent with the c15t ahrefsAnalytics helper, and check it in DevTools.
- [Amplitude](./docs/integrations/amplitude.md): Load the Amplitude Browser SDK 2 only after measurement consent with the c15t amplitude helper, which opts the SDK out on revocation and back in on a new grant.
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
