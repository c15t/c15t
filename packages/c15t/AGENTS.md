# c15t

> c15t v3 framework integration and consent management. Install c15t and use its framework subpaths; adapters and add-ons absent from its exports use separate packages.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Using these docs

These docs describe c15t v3. Find your app's row in Choose your setup, then follow that framework guide from start to finish; it names the files to create and the backend URL to use. Install c15t packages with the @alpha dist-tag, because npm latest is still v2. A visible banner does not prove anything: check that vendor requests wait for consent, that rejection survives a reload, and that preferences can be reopened.

## Start here

- [Choose your framework](./docs/frameworks/index.md)
- [Choose your setup](./docs/concepts/choose-your-setup.md): Pick the c15t setup for your framework, rendering mode and hosting, and decide who runs the consent backend.
- [How consent works](./docs/concepts/how-consent-works.md): What c15t decides on each page load, the difference between a permission and a recorded choice, and what happens when a visitor saves.
- [Customize the interface](./docs/customization/overview.md): Change c15t's consent banner and dialog one step at a time, from a prop to your own markup, and find where each step lives in your framework.
- [Verify consent](./docs/guides/verify-consent.md): Check in a production build that vendor requests wait for consent, rejection survives a reload, preferences reopen and privacy signals apply.
- [Migrate to v3](./docs/upgrade-v3.md): Upgrade a c15t v2 app to v3. Covers packages, the Next.js and React providers, the JavaScript runtime, custom UI built on useConsentManager, callbacks, policies, stored consent and a self-hosted backend.

## More documentation

[Documentation index](https://c15t.com/docs/llms.txt) · [Full Markdown context](https://c15t.com/llms-full.txt). Prefer the index and individual pages for focused tasks.

## Frameworks

- [Frameworks](./docs/frameworks/index.md): c15t setup guides for Next.js, TanStack Start, React, Nuxt, Vue, Astro, Svelte, SvelteKit, plain HTML and JavaScript.

### Next.js

- [App Router](./docs/frameworks/next/app-router.md): Set up c15t in the Next.js App Router with Inth, a cached policy manifest, consent-gated scripts and a streamed or awaited root layout.
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
- [Headless](./docs/frameworks/next/headless.md): Build a custom consent banner in Next.js with the c15t/next/headless hooks inside your existing ConsentRoot.
- [Hooks](./docs/frameworks/next/hooks.md): Gate features and save consent choices in Next.js Client Components with the focused hooks exported from c15t/next.
- [IAB TCF](./docs/frameworks/next/iab.md): Mount the IAB TCF banner and dialog inside a Next.js ConsentRoot and configure the CMP ID, policy and vendor data.
- [Network blocker](./docs/frameworks/next/network-blocker.md): Hold fetch and XMLHttpRequest calls in a Next.js app until their consent category is allowed, with networkBlocker rules on ConsentRoot.
- [Performance](./docs/frameworks/next/optimization.md): Reuse cached policy data and optionally reduce browser connection overhead without changing consent behavior.
- [Pages Router](./docs/frameworks/next/pages-router.md): Set up c15t in the Next.js Pages Router with Inth, a cached policy manifest, getServerSideProps and consent-gated scripts.
- [Quickstart](./docs/frameworks/next/quickstart.md): Add c15t consent management to a Next.js App Router app with Inth, a cached policy manifest and consent-gated scripts, then check it works. Links to the Pages Router and static export guides.
- [Rendering and deployment](./docs/frameworks/next/rendering.md): Choose how Next.js resolves consent for your router, rendering mode and hosting, from streamed App Router layouts to static export, ISR and Cache Components.
- [Scripts](./docs/frameworks/next/scripts.md): Register vendor scripts in a Next.js ConsentRoot, check how each vendor loads, let visitors turn off one vendor and clear stored data after revocation.
- [Static export](./docs/frameworks/next/static-export.md): Add c15t to a Next.js site built with output export, where the browser resolves consent through Inth without request helpers or API routes.
- [Translations](./docs/frameworks/next/translations.md): Where c15t banner and dialog copy comes from in Next.js, how the server and browser pick the visitor's language, and how to override copy and switch languages from a Client Component.
- [Troubleshooting](./docs/frameworks/next/troubleshooting.md): Diagnose failed c15t consent prefetch in Next.js, verify manifest requests, and fix symbol serialization warnings, unknown server location and prerendering errors.
- [Vendor consent](./docs/frameworks/next/vendor-consent.md): Let visitors allow a category such as marketing in a Next.js app and still turn off one vendor in it, with the vendors prop on ConsentRoot and useVendorAllowed.

### TanStack Start

- [Callbacks](./docs/frameworks/tanstack-start/callbacks.md): Run code in a TanStack Start app when a visitor records a consent choice, when permissions change, when a request fails and before the revocation reload, from ConsentRoot in the root route.
- [Clear on revocation](./docs/frameworks/tanstack-start/clear-on-revocation.md): Delete the first-party cookies and Web Storage keys a consent category owns in a TanStack Start app when that category is denied, with the clearOnRevocation prop on ConsentRoot.
- [Components](./docs/frameworks/tanstack-start/components.md): ConsentRoot and the consent banner, dialog, widget, links, gate and DevTools components a TanStack Start app imports from c15t/tanstack-start.
- [ConsentBanner](./docs/frameworks/tanstack-start/components/consent-banner.md): Render the c15t consent banner in a TanStack Start app, set its variant and position, and override its labels.
- [ConsentDialog](./docs/frameworks/tanstack-start/components/consent-dialog.md): Open the c15t preference dialog in a TanStack Start app, reopen it from your own controls, and control blocking, focus and policy gating.
- [ConsentDialogLink](./docs/frameworks/tanstack-start/components/consent-dialog-link.md): Add a ConsentDialogLink to a TanStack Start footer so visitors can reopen the c15t preference dialog from your own text link.
- [ConsentDialogTrigger](./docs/frameworks/tanstack-start/components/consent-dialog-trigger.md): Add a floating button or toolbar to a TanStack Start app that reopens the c15t preference dialog after the first prompt.
- [ConsentGate](./docs/frameworks/tanstack-start/components/consent-gate.md): Gate a YouTube video, map or other iframe behind consent in a TanStack Start app with ConsentGate, showing a placeholder until the category is allowed.
- [ConsentWidget](./docs/frameworks/tanstack-start/components/consent-widget.md): Embed the c15t preference controls inline on a TanStack Start privacy page with ConsentWidget, recording a choice only when the visitor saves.
- [DevTools](./docs/frameworks/tanstack-start/components/dev-tools.md): Inspect consent state, location, loaded scripts and consent events in a TanStack Start app during development, on its own or inside TanStack Devtools.
- [Compose your own banner](./docs/frameworks/tanstack-start/compose.md): Build a TanStack Start consent banner from the ConsentBanner parts in c15t/tanstack-start, with your own markup and buttons, rendered inside ConsentRoot in the root route.
- [Content Security Policy](./docs/frameworks/tanstack-start/content-security-policy.md): Run c15t in a TanStack Start app under a Content Security Policy, pass the router's per-request nonce to ConsentRoot, and allow the consent backend and vendor hosts.
- [Customize](./docs/frameworks/tanstack-start/customize.md): Change the colors, fonts, layout, button styles and copy of the c15t banner and dialog in a TanStack Start app with the stylesheet, theme tokens, ConsentRoot options and component parts.
- [Embeds](./docs/frameworks/tanstack-start/embeds.md): Keep YouTube videos, maps and other iframes out of a TanStack Start page until their consent category is allowed, with ConsentGate or the iframe blocker in ConsentRoot.
- [Geography headers](./docs/frameworks/tanstack-start/geography-headers.md): Which request headers c15t reads for country, region, language and Global Privacy Control in TanStack Start, where the server functions and consent route send them, and how to test another location.
- [Headless](./docs/frameworks/tanstack-start/headless.md): Build your own consent banner markup in a TanStack Start app with the c15t/tanstack-start/headless hooks inside ConsentRoot.
- [Hooks](./docs/frameworks/tanstack-start/hooks.md): Read consent permissions, open the preference dialog and save choices in TanStack Start components with the hooks exported from c15t/tanstack-start.
- [IAB TCF](./docs/frameworks/tanstack-start/iab.md): Show the IAB TCF banner and dialog in a TanStack Start app for visitors whose policy uses the IAB model, with c15t/react/iab inside ConsentRoot.
- [Network blocker](./docs/frameworks/tanstack-start/network-blocker.md): Hold fetch and XMLHttpRequest calls in a TanStack Start app until their consent category is allowed, with networkBlocker rules on ConsentRoot.
- [Quickstart](./docs/frameworks/tanstack-start/quickstart.md): Resolve consent on the server in a TanStack Start root loader, render the banner in the first HTML, and gate vendor scripts, using Inth as the consent backend.
- [Rendering and deployment](./docs/frameworks/tanstack-start/rendering.md): Choose how a TanStack Start app resolves consent, with an awaited or streamed root loader, a same-origin consent route, or SPA mode, prerendered pages and static hosting.
- [Scripts](./docs/frameworks/tanstack-start/scripts.md): Load vendor scripts by consent category in a TanStack Start app with ConsentRoot, and clear stored data or reload the page when a visitor withdraws consent.
- [Translations](./docs/frameworks/tanstack-start/translations.md): Where c15t banner and dialog copy comes from in TanStack Start, how the server and browser pick the visitor's language, and how to override copy and switch languages from the root route.
- [Troubleshooting](./docs/frameworks/tanstack-start/troubleshooting.md): Fix a missing server-rendered banner, server function errors, proxy and firewall failures, and early vendor requests in a TanStack Start app that uses c15t.
- [Vendor consent](./docs/frameworks/tanstack-start/vendor-consent.md): Let visitors allow a category such as marketing in a TanStack Start app and still turn off one vendor in it, with the vendors prop on ConsentRoot and useVendorAllowed.

### React

- [Callbacks](./docs/frameworks/react/callbacks.md): Run code in a React app when a visitor records a consent choice, when permissions change, when a request fails and before the revocation reload, with the ConsentProvider callbacks option.
- [Clear on revocation](./docs/frameworks/react/clear-on-revocation.md): Delete the first-party cookies and Web Storage keys a consent category owns in a React app when that category is denied, with the clearOnRevocation option on ConsentProvider.
- [Components](./docs/frameworks/react/components.md): Every c15t component a React app imports from c15t/react, what each renders, where each one mounts, and which to start with.
- [ConsentBanner](./docs/frameworks/react/components/consent-banner.md): Render the c15t consent banner in a React app, choose its variant and position, and compose its parts.
- [ConsentDialog](./docs/frameworks/react/components/consent-dialog.md): Open the c15t preference center as a modal ConsentDialog in a React app, wire its triggers and control blocking, focus and policy gating.
- [ConsentDialogLink](./docs/frameworks/react/components/consent-dialog-link.md): Add a ConsentDialogLink to a React footer so visitors reopen the c15t preference center from your own text link, with asChild and rights data.
- [ConsentDialogTrigger](./docs/frameworks/react/components/consent-dialog-trigger.md): Add the c15t ConsentDialogTrigger floating button or toolbar inside a React ConsentProvider so visitors can reopen the preference center after the first prompt.
- [ConsentGate](./docs/frameworks/react/components/consent-gate.md): Gate a YouTube or map iframe behind consent with ConsentGate in React, showing a placeholder that opens the preference center until the category is allowed.
- [ConsentProvider](./docs/frameworks/react/components/consent-provider.md): Mount ConsentProvider in a React app and configure its backend, scripts, storage, blocking and presentation options.
- [ConsentWidget](./docs/frameworks/react/components/consent-widget.md): Embed the c15t preference center inline with ConsentWidget on a React privacy page, with draft toggles that record a choice only on Save.
- [DevTools](./docs/frameworks/react/components/dev-tools.md): Inspect consent state, location, loaded scripts and consent events in a React app during development with the c15t DevTools panel.
- [Compose your own banner](./docs/frameworks/react/compose.md): Build a React consent banner from the ConsentBanner parts in c15t/react, with your own markup and buttons, while the policy still decides which actions appear.
- [Content Security Policy](./docs/frameworks/react/content-security-policy.md): Run c15t in a React app under a Content Security Policy, allow the consent backend and vendor hosts, and pass a nonce to ConsentProvider and ConsentTheme.
- [Customize](./docs/frameworks/react/customize.md): Change the colors, fonts, layout, button styles and copy of the c15t banner and dialog in a React app with the stylesheet, theme tokens, provider options and slots.
- [Embeds](./docs/frameworks/react/embeds.md): Keep YouTube videos, maps and other iframes out of a React page until their consent category is allowed, with ConsentGate or the iframe blocker in ConsentProvider.
- [Headless](./docs/frameworks/react/headless.md): Build a custom consent banner in React with the c15t/react/headless hooks inside your ConsentProvider.
- [Hooks](./docs/frameworks/react/hooks.md): Gate features and save consent choices in React components with the focused hooks exported from c15t/react.
- [IAB TCF](./docs/frameworks/react/iab.md): Mount the IAB TCF banner and dialog inside a React ConsentProvider and configure the CMP ID, policy and vendor data.
- [Network blocker](./docs/frameworks/react/network-blocker.md): Hold fetch and XMLHttpRequest calls in a React app until their consent category is allowed, with networkBlocker rules in the ConsentProvider options.
- [Quickstart](./docs/frameworks/react/quickstart.md): Add a consent banner, preferences dialog and consent-gated scripts to a React single-page app built with Vite, using Inth as the consent backend.
- [Rendering and deployment](./docs/frameworks/react/rendering.md): How c15t resolves consent in client-rendered React apps, React Router framework mode, Remix and other server-rendered React apps without a c15t adapter.
- [Scripts](./docs/frameworks/react/scripts.md): Load vendor scripts by consent category in a React app with ConsentProvider, and clear stored data or reload the page when a visitor withdraws consent.
- [Translations](./docs/frameworks/react/translations.md): Where c15t banner and dialog copy comes from in a React app, how the browser picks the visitor's language, and how to override copy and switch languages with the provider's i18n option and hooks.
- [Troubleshooting](./docs/frameworks/react/troubleshooting.md): Fix a missing banner, early vendor requests, unstyled components and theme warnings in a React app that uses c15t/react.
- [Vendor consent](./docs/frameworks/react/vendor-consent.md): Let visitors allow a category such as marketing in a React app and still turn off one vendor in it, with the vendors option on ConsentProvider and useVendorAllowed.

### Nuxt

- [Callbacks](./docs/frameworks/nuxt/callbacks.md): Run code in a Nuxt app when a visitor records a consent choice, when permissions change, before a revocation reload, and when c15t reports an error.
- [Clear on revocation](./docs/frameworks/nuxt/clear-on-revocation.md): Delete the first-party cookies and Web Storage keys a consent category owns in a Nuxt app when that category is denied, with the clearOnRevocation option of the c15t Nuxt module.
- [Components](./docs/frameworks/nuxt/components.md): Every c15t component in Nuxt, which ones the Nuxt module registers globally, which you import, and a page for each one's props and behavior.
- [ConsentBanner](./docs/frameworks/nuxt/components/consent-banner.md): Render the c15t consent banner in Nuxt, choose its variant and position, and understand what it shows for each policy.
- [ConsentDialogTrigger](./docs/frameworks/nuxt/components/consent-dialog-trigger.md): Show a floating, draggable button that reopens the c15t preference dialog in Nuxt, and configure its corner, size, icon and label.
- [ConsentGate](./docs/frameworks/nuxt/components/consent-gate.md): Render an iframe or widget in Nuxt only while its consent category is allowed, with the globally registered ConsentGate and a placeholder slot.
- [ConsentManager](./docs/frameworks/nuxt/components/consent-manager.md): Render the c15t preference dialog in Nuxt, open it from your own code, and understand its actions, focus handling and styling.
- [ConsentPreferencesLink](./docs/frameworks/nuxt/components/consent-preferences-link.md): Add a Privacy settings button that reopens the c15t preference dialog in Nuxt, and hide it when the policy offers no preferences.
- [ConsentRoot](./docs/frameworks/nuxt/components/consent-root.md): Mount the c15t banner, preference dialog and floating trigger in Nuxt with the globally registered ConsentRoot, rendered on the server.
- [ConsentWidget](./docs/frameworks/nuxt/components/consent-widget.md): Put the c15t category switches and save actions inline on a Nuxt privacy settings page with the globally registered ConsentWidget.
- [DevTools](./docs/frameworks/nuxt/components/dev-tools.md): Inspect consent state, the resolved policy, location, scripts and consent events in a Nuxt app during development with ConsentDevTools.
- [IABConsentBanner](./docs/frameworks/nuxt/components/iab-consent-banner.md): Render the IAB TCF first layer in Nuxt with IABConsentBanner, when to import it instead of relying on ConsentRoot, and its props.
- [IABConsentDialog](./docs/frameworks/nuxt/components/iab-consent-dialog.md): Render the IAB TCF preference centre in Nuxt with IABConsentDialog, choose its first tab, and build a custom one with composables.
- [Composables](./docs/frameworks/nuxt/composables.md): Every c15t composable the Nuxt module auto-imports, grouped by task, with the difference between a permission and a recorded choice.
- [Content Security Policy](./docs/frameworks/nuxt/content-security-policy.md): Allow c15t in a Nuxt app under a Content Security Policy, including the theme token style tag, same-origin routes, the backend and vendor scripts.
- [Customize](./docs/frameworks/nuxt/customize.md): Change the c15t banner and dialog in Nuxt with theme tokens, layout presentation, component slots and copy.
- [Embeds](./docs/frameworks/nuxt/embeds.md): Keep YouTube videos, maps and other iframes out of a Nuxt page until their consent category is allowed, with ConsentGate or the iframe blocker.
- [Geography headers](./docs/frameworks/nuxt/geography-headers.md): Which request headers the c15t Nuxt module reads for the visitor's country, region, language and Global Privacy Control, and how to trust and test them.
- [Headless](./docs/frameworks/nuxt/headless.md): Build your own consent banner and preference form in Nuxt with the auto-imported c15t composables instead of ConsentRoot.
- [IAB TCF](./docs/frameworks/nuxt/iab.md): Show the IAB TCF banner and preference centre in Nuxt with the c15t Nuxt module when your Inth policy uses the IAB model.
- [Nuxt module](./docs/frameworks/nuxt/module.md): What the c15t Nuxt module registers, where each option goes between nuxt.config.ts and app.config.ts, and every module option.
- [Network blocker](./docs/frameworks/nuxt/network-blocker.md): Hold fetch and XMLHttpRequest calls in a Nuxt app until their consent category is allowed, with rules in the c15t module options.
- [Quickstart](./docs/frameworks/nuxt/quickstart.md): Add c15t to a server-rendered Nuxt app with the Nuxt module, Inth, consent-gated scripts and a preferences link.
- [Rendering and deployment](./docs/frameworks/nuxt/rendering.md): Choose the c15t Nuxt module setup for server rendering, prerendered and cached routes, nuxt generate on static hosting, and ssr false.
- [Scripts](./docs/frameworks/nuxt/scripts.md): Load vendor scripts by consent category in a Nuxt app with the c15t Nuxt module, and what happens when a visitor withdraws consent.
- [Translations](./docs/frameworks/nuxt/translations.md): Where the c15t banner and dialog text comes from in Nuxt, how the server picks the visitor's language, and how to switch it at runtime.
- [Troubleshooting](./docs/frameworks/nuxt/troubleshooting.md): Fix common c15t Nuxt module problems, from a missing banner and scripts that never load to returning banners and static hosting.
- [Vendor consent](./docs/frameworks/nuxt/vendor-consent.md): Let visitors allow a category such as marketing in a Nuxt app and still turn off one vendor in it, with the vendors option of the c15t Nuxt module and useConsentDraft.

### Vue

- [Callbacks](./docs/frameworks/vue/callbacks.md): Run code in a Vue app when a visitor records a consent choice, when permissions change, before a revocation reload, and when c15t reports an error.
- [Clear on revocation](./docs/frameworks/vue/clear-on-revocation.md): Delete the first-party cookies and Web Storage keys a consent category owns in a Vue app when that category is denied, with the clearOnRevocation option on the c15tVue plugin.
- [Components](./docs/frameworks/vue/components.md): Every c15t Vue component, its import path and what it renders, with a page for each one's props, behavior, accessibility and styling.
- [ConsentBanner](./docs/frameworks/vue/components/consent-banner.md): Render the c15t consent banner in a Vue app, choose its variant and position, and understand what it shows for each policy.
- [ConsentDialogTrigger](./docs/frameworks/vue/components/consent-dialog-trigger.md): Show a floating, draggable button that reopens the c15t preference dialog in a Vue app, and configure its corner, size, icon and label.
- [ConsentGate](./docs/frameworks/vue/components/consent-gate.md): Render an iframe or widget in a Vue app only while its consent category is allowed, with a placeholder slot until then.
- [ConsentManager](./docs/frameworks/vue/components/consent-manager.md): Render the c15t preference dialog in a Vue app, open it from your own code, and understand its actions, focus handling and styling.
- [ConsentPreferencesLink](./docs/frameworks/vue/components/consent-preferences-link.md): Add a Privacy settings button that reopens the c15t preference dialog in a Vue app, and hide it when the policy offers no preferences.
- [ConsentRoot](./docs/frameworks/vue/components/consent-root.md): Mount the c15t banner, preference dialog and floating trigger in a Vue app with one ConsentRoot component from c15t/vue/consent-root.
- [ConsentWidget](./docs/frameworks/vue/components/consent-widget.md): Put the c15t category switches and save actions inline on a Vue privacy settings page with ConsentWidget from c15t/vue/consent-widget.
- [DevTools](./docs/frameworks/vue/components/dev-tools.md): Inspect consent state, the resolved policy, location, scripts and consent events in a Vue app during development with ConsentDevTools.
- [IABConsentBanner](./docs/frameworks/vue/components/iab-consent-banner.md): Render the IAB TCF first layer in a Vue app with IABConsentBanner, when to import it instead of relying on ConsentRoot, and its props.
- [IABConsentDialog](./docs/frameworks/vue/components/iab-consent-dialog.md): Render the IAB TCF preference centre in a Vue app with IABConsentDialog, choose its first tab, and build a custom one with composables.
- [Composables](./docs/frameworks/vue/composables.md): Every c15t composable for a Vue app, grouped by task, with the difference between a permission and a recorded choice.
- [Content Security Policy](./docs/frameworks/vue/content-security-policy.md): Allow c15t in a Vue app under a Content Security Policy, with a script nonce, the backend in connect-src, and the styles the components inject.
- [Customize](./docs/frameworks/vue/customize.md): Change the c15t banner and dialog in a Vue app with theme tokens, layout presentation, component slots and copy.
- [Embeds](./docs/frameworks/vue/embeds.md): Keep YouTube videos, maps and other iframes out of a Vue page until their consent category is allowed, with ConsentGate or the iframe blocker.
- [Headless](./docs/frameworks/vue/headless.md): Build your own consent banner and preference form in a Vue app with the c15t composables instead of ConsentRoot.
- [IAB TCF](./docs/frameworks/vue/iab.md): Show the IAB TCF banner and preference centre in a Vue app with the c15t Vue plugin when your Inth policy uses the IAB model.
- [Network blocker](./docs/frameworks/vue/network-blocker.md): Hold fetch and XMLHttpRequest calls in a Vue app until their consent category is allowed, with rules passed to the c15t Vue plugin.
- [c15tVue plugin](./docs/frameworks/vue/plugin.md): Install c15t in a Vue app with app.use(c15tVue), what the plugin starts when the app mounts, and every option it accepts.
- [Quickstart](./docs/frameworks/vue/quickstart.md): Add c15t to a Vue 3 app built with Vite, using the Vue plugin, Inth, consent-gated scripts and a preferences link.
- [Rendering and deployment](./docs/frameworks/vue/rendering.md): How the c15t Vue plugin resolves consent in the browser, how to host it statically, and why server-rendered Vue apps should use Nuxt.
- [Scripts](./docs/frameworks/vue/scripts.md): Load vendor scripts by consent category in a Vue app with the c15t Vue plugin, and what happens when a visitor withdraws consent.
- [Translations](./docs/frameworks/vue/translations.md): Where the c15t banner and dialog text comes from in a Vue app, how c15t picks the visitor's language, and how to switch it at runtime.
- [Troubleshooting](./docs/frameworks/vue/troubleshooting.md): Fix common c15t Vue plugin problems, from unresolved imports and a missing banner to tokens that do not apply and scripts that load twice.
- [Vendor consent](./docs/frameworks/vue/vendor-consent.md): Let visitors allow a category such as marketing in a Vue app and still turn off one vendor in it, with the vendors option on the c15tVue plugin and useConsentDraft.

### Astro

- [Callbacks](./docs/frameworks/astro/callbacks.md): Run your own code on an Astro site when a visitor records a consent choice, when permissions change, before a revocation reload and on errors, with c15t callbacks in the client entrypoint.
- [Clear on revocation](./docs/frameworks/astro/clear-on-revocation.md): Delete the first-party cookies and Web Storage keys a consent category owns on an Astro site when that category is denied, with the clearOnRevocation option of the c15t integration.
- [Client API](./docs/frameworks/astro/client-api.md): Reference for c15t/astro/client on an Astro site, grouped by task, from reading permissions and recorded choices to opening dialogs, saving consent, gated scripts, the page runtime and analytics events.
- [Components](./docs/frameworks/astro/components.md): Every c15t Astro component, from ConsentScript and ConsentBanner to the server island banner, the preference dialog, its trigger and the IAB TCF surfaces, with import paths and links to each reference.
- [ConsentBanner](./docs/frameworks/astro/components/consent-banner.md): Render the c15t consent banner as server HTML on an Astro site, with props for copy, legal links and branding, the policy-driven actions, accessibility behavior and the attributes to style it.
- [ConsentBannerDeferred](./docs/frameworks/astro/components/consent-banner-deferred.md): Render the c15t consent banner in an Astro server island, so a cached or prerendered page still shows each visitor the banner for their own location and stored choice.
- [ConsentDialog](./docs/frameworks/astro/components/consent-dialog.md): Add the c15t preference dialog to an Astro site as an island that downloads only when a visitor opens it, and control when it loads, which framework renders it, how it opens and which legal links it shows.
- [ConsentDialogTrigger](./docs/frameworks/astro/components/consent-dialog-trigger.md): Add a footer button or link that reopens the c15t preference dialog or the IAB TCF preference center on an Astro site, with no JavaScript of its own.
- [ConsentScript](./docs/frameworks/astro/components/consent-script.md): Put the c15t ConsentScript component in the head of an Astro layout so the browser starts with the server's consent decision, the right color scheme and your theme tokens.
- [IABConsentBanner](./docs/frameworks/astro/components/iab-consent-banner.md): Render the IAB TCF 2.4 banner as server HTML on an Astro site with c15t, with the purposes, partner count and actions TCF requires, its props, accessibility and styling attributes.
- [IABConsentDialog](./docs/frameworks/astro/components/iab-consent-dialog.md): Add the IAB TCF 2.4 preference center to an Astro site with c15t as an island that loads the TCF code only when a visitor opens it.
- [Content Security Policy](./docs/frameworks/astro/content-security-policy.md): Run c15t on an Astro site under a strict Content Security Policy, with a per-request nonce from your middleware or with Astro's own hash-based CSP, and allow the consent backend and vendors.
- [Customize](./docs/frameworks/astro/customize.md): Change the c15t banner and preference dialog on an Astro site with theme tokens, button styles, copy, dark mode, legal links and your own stylesheet order, all from the integration options.
- [Embeds](./docs/frameworks/astro/embeds.md): Gate YouTube videos, maps, social posts and other iframes on an Astro site so they load only after the visitor allows their consent category, with a custom element or the c15t iframe blocker.
- [Geography headers](./docs/frameworks/astro/geography-headers.md): Which request headers the c15t Astro middleware reads for the visitor's country, region, language and Global Privacy Control, how to check your host sends them, and how to test a region locally.
- [IAB TCF](./docs/frameworks/astro/iab.md): Render the IAB TCF 2.4 banner and preference center on an Astro site with the c15t integration, and configure the CMP ID, vendor list source and publisher restrictions.
- [Integration options](./docs/frameworks/astro/integration.md): Reference for every option of the c15t() Astro integration, the Astro equivalent of a consent provider, from mode and scripts to ui, theme, i18n, middleware, endpoints and the client entrypoint.
- [Islands](./docs/frameworks/astro/islands.md): Choose whether React, Vue or Svelte renders the c15t preference dialog on an Astro site, and read consent from your own framework islands through the page's shared consent runtime.
- [Network blocker](./docs/frameworks/astro/network-blocker.md): Block fetch and XMLHttpRequest calls to tracking hosts on an Astro site until the visitor allows their consent category, with c15t's network blocker rules and an onRequestBlocked handler.
- [Quickstart](./docs/frameworks/astro/quickstart.md): Add a c15t consent banner, preference dialog and consent-gated scripts to an Astro 5, 6 or 7 site with the c15t integration and Inth, on static or server output.
- [Rendering and deployment](./docs/frameworks/astro/rendering.md): Choose how c15t resolves consent on an Astro site, from static output with hosted mode to server output with manifest mode, prerendered pages, server islands, ClientRouter and offline development.
- [Scripts](./docs/frameworks/astro/scripts.md): Load vendor scripts and gated inline scripts on an Astro site only after the visitor allows their consent category, and stop them when consent is withdrawn.
- [Server API](./docs/frameworks/astro/server.md): How the c15t middleware resolves consent for each Astro request, what Astro.locals.c15t holds, the helpers in c15t/astro/server, the injected init and manifest routes, and how to cache server-rendered pages safely.
- [Translations](./docs/frameworks/astro/translations.md): Set the language and wording of the c15t banner and preference dialog on an Astro site with the integration's i18n option, from Accept-Language negotiation to per-language message overrides and banner props.
- [Troubleshooting](./docs/frameworks/astro/troubleshooting.md): Fix common c15t problems on Astro sites, from build errors about adapters and UI integrations to a missing banner, scripts that run too early, unstyled dialogs and saves that fail.
- [Vendor consent](./docs/frameworks/astro/vendor-consent.md): Let visitors allow a category such as marketing on an Astro site and still turn off one vendor in it, with the vendors option on the c15t() integration and the page client from c15t/astro/client.

### Svelte

- [Callbacks](./docs/frameworks/svelte/callbacks.md): Run your own code in a Svelte app when a visitor records a choice or permissions change, with onChoiceRecorded, onPermissionsChanged and script callbacks.
- [Clear on revocation](./docs/frameworks/svelte/clear-on-revocation.md): Delete the first-party cookies and Web Storage keys a consent category owns in a Svelte app when that category is denied, with the clearOnRevocation prop on ConsentManagerProvider.
- [Components](./docs/frameworks/svelte/components.md): Props and behavior of every @c15t/svelte component in a Svelte app, from ConsentManagerProvider and ConsentBanner to ConsentGate and DevTools.
- [ConsentBanner](./docs/frameworks/svelte/components/consent-banner.md): Show the c15t cookie banner in a Svelte app with ConsentBanner, and set its variant, position, button layout, copy, accessibility and styling hooks.
- [ConsentButton](./docs/frameworks/svelte/components/consent-button.md): Accept, reject, save or open preferences from your own Svelte markup with ConsentButton, and what each action records.
- [ConsentDialog](./docs/frameworks/svelte/components/consent-dialog.md): Add the c15t preference dialog to a Svelte app with ConsentDialog, including how it loads on first use, its props, keyboard behavior and theme slots.
- [ConsentDialogLink](./docs/frameworks/svelte/components/consent-dialog-link.md): Let visitors reopen c15t preferences from a Svelte footer with ConsentDialogLink, an unstyled button that renders only when the policy offers preferences.
- [ConsentDialogTrigger](./docs/frameworks/svelte/components/consent-dialog-trigger.md): Add a floating, draggable privacy button to a Svelte app with ConsentDialogTrigger, and set its corner, size, saved position, accessible name and callbacks.
- [ConsentGate](./docs/frameworks/svelte/components/consent-gate.md): Keep a YouTube video or map out of a Svelte page until its consent category is allowed with ConsentGate, and replace its placeholder.
- [ConsentManagerProvider](./docs/frameworks/svelte/components/consent-manager-provider.md): Mount ConsentManagerProvider at the root of a Svelte app to start c15t, with every prop, its default, and which options update after mount.
- [ConsentWidget](./docs/frameworks/svelte/components/consent-widget.md): Put c15t's category switches inline on a Svelte privacy settings page with ConsentWidget, and how its draft, vendors and stale-policy alert behave.
- [DevTools](./docs/frameworks/svelte/components/dev-tools.md): Inspect consent, scripts, location and events in a Svelte app with ConsentDevTools from @c15t/svelte/devtools, loaded only in development.
- [IABConsentBanner](./docs/frameworks/svelte/components/iab-consent-banner.md): Show the IAB TCF 2.4 first-layer banner to visitors under an IAB policy in a Svelte app with IABConsentBanner, its props and behavior.
- [IABConsentDialog](./docs/frameworks/svelte/components/iab-consent-dialog.md): Show the IAB TCF 2.4 preference center with purposes, features and vendors in a Svelte app with IABConsentDialog.
- [Primitives](./docs/frameworks/svelte/components/primitives.md): Build your own accessible consent dialog in Svelte with the Dialog, Switch, Tabs, Accordion and PreferenceItem primitives and the focusTrap, scrollLock and portal actions.
- [Content Security Policy](./docs/frameworks/svelte/content-security-policy.md): Write a Content Security Policy for a Svelte app using c15t, with the hosts to allow, the provider's nonce option and what c15t injects.
- [Customize](./docs/frameworks/svelte/customize.md): Change c15t's colors, shape, button styles and copy in a Svelte app with a token stylesheet, theme slots, presentation props and translations.
- [Embeds](./docs/frameworks/svelte/embeds.md): Keep YouTube videos, maps and other iframes out of a Svelte page until their consent category is allowed, with ConsentGate or the iframe blocker.
- [Context getters](./docs/frameworks/svelte/getters.md): Reference for every @c15t/svelte context getter in a Svelte app, from reading permissions and recorded choices to saving, the draft, IAB state and kernel events.
- [Headless](./docs/frameworks/svelte/headless.md): Replace the c15t banner or preference dialog with your own Svelte markup while the provider keeps policy, storage and script loading.
- [IAB TCF](./docs/frameworks/svelte/iab.md): Turn on the IAB TCF 2.4 banner and preference center in a Svelte app with IABConsentBanner, IABConsentDialog and the provider's iab option.
- [Network blocker](./docs/frameworks/svelte/network-blocker.md): Hold fetch and XMLHttpRequest calls to tracking domains in a Svelte app until their consent category is allowed, with the provider's networkBlocker option.
- [Quickstart](./docs/frameworks/svelte/quickstart.md): Add a c15t cookie banner, preference dialog and consent-gated scripts to a Svelte 5 app built with Vite, using Inth for policies and consent records.
- [Scripts](./docs/frameworks/svelte/scripts.md): Load vendor scripts, iframes and network requests in a Svelte app only after the visitor allows their consent category, and stop them when consent is withdrawn.
- [Translations](./docs/frameworks/svelte/translations.md): Change c15t banner and dialog copy in a Svelte app with component text props or the provider's i18n option, and switch languages at runtime.
- [Troubleshooting](./docs/frameworks/svelte/troubleshooting.md): Fix a missing banner, a wrong backend URL, ignored theme colors and vendors that load before consent in a Svelte app.
- [Vendor consent](./docs/frameworks/svelte/vendor-consent.md): Let visitors allow a category such as marketing in a Svelte app and still turn off one vendor in it, with the vendors prop on ConsentManagerProvider and getConsentManager.

### SvelteKit

- [Callbacks](./docs/frameworks/sveltekit/callbacks.md): Run your own code in a SvelteKit app when a visitor records a choice or permissions change, with onChoiceRecorded, onPermissionsChanged and script callbacks.
- [Clear on revocation](./docs/frameworks/sveltekit/clear-on-revocation.md): Delete the first-party cookies and Web Storage keys a consent category owns in a SvelteKit app when that category is denied, with the clearOnRevocation prop on ConsentManagerProvider.
- [Components](./docs/frameworks/sveltekit/components.md): Props and behavior of every @c15t/svelte component in a SvelteKit app, from ConsentManagerProvider and ConsentBanner to ConsentGate and DevTools.
- [ConsentBanner](./docs/frameworks/sveltekit/components/consent-banner.md): Show the c15t cookie banner in SvelteKit server HTML with ConsentBanner, and set its variant, position, button layout, copy, accessibility and styling hooks.
- [ConsentButton](./docs/frameworks/sveltekit/components/consent-button.md): Accept, reject, save or open preferences from SvelteKit pages with ConsentButton, and what each action records.
- [ConsentDialog](./docs/frameworks/sveltekit/components/consent-dialog.md): Add the c15t preference dialog to a SvelteKit root layout with ConsentDialog, including how it loads after hydration, its props, keyboard behavior and theme slots.
- [ConsentDialogLink](./docs/frameworks/sveltekit/components/consent-dialog-link.md): Let visitors reopen c15t preferences from a SvelteKit layout footer with ConsentDialogLink, rendered in server HTML when the policy offers preferences.
- [ConsentDialogTrigger](./docs/frameworks/sveltekit/components/consent-dialog-trigger.md): Add a floating, draggable privacy button to a SvelteKit layout with ConsentDialogTrigger, and set its corner, size, saved position, accessible name and callbacks.
- [ConsentGate](./docs/frameworks/sveltekit/components/consent-gate.md): Keep a YouTube video or map out of SvelteKit server HTML until its consent category is allowed with ConsentGate, and replace its placeholder.
- [ConsentManagerProvider](./docs/frameworks/sveltekit/components/consent-manager-provider.md): Mount ConsentManagerProvider in a SvelteKit root layout with a server prefetch so the banner is in the first HTML, with every prop and its default.
- [ConsentWidget](./docs/frameworks/sveltekit/components/consent-widget.md): Put c15t's category switches inline on a SvelteKit privacy settings route with ConsentWidget, and how its draft, vendors and stale-policy alert behave.
- [DevTools](./docs/frameworks/sveltekit/components/dev-tools.md): Inspect consent, scripts, location and events in a SvelteKit app with ConsentDevTools, imported only when $app/env reports development.
- [IABConsentBanner](./docs/frameworks/sveltekit/components/iab-consent-banner.md): Show the IAB TCF 2.4 first-layer banner to visitors under an IAB policy in a SvelteKit app with IABConsentBanner, its props and behavior.
- [IABConsentDialog](./docs/frameworks/sveltekit/components/iab-consent-dialog.md): Show the IAB TCF 2.4 preference center with purposes, features and vendors in a SvelteKit app with IABConsentDialog.
- [Primitives](./docs/frameworks/sveltekit/components/primitives.md): Build your own accessible consent dialog in SvelteKit with the Dialog, Switch, Tabs, Accordion and PreferenceItem primitives and the focusTrap, scrollLock and portal actions.
- [Content Security Policy](./docs/frameworks/sveltekit/content-security-policy.md): Write a Content Security Policy for a SvelteKit app using c15t with SvelteKit's csp option, covering vendor hosts, the server-rendered theme style and style attributes.
- [Customize](./docs/frameworks/sveltekit/customize.md): Render c15t brand colors on the SvelteKit server with generateThemeCSS, and change slots, button styles, banner shape and copy.
- [Embeds](./docs/frameworks/sveltekit/embeds.md): Keep YouTube videos, maps and other iframes out of SvelteKit server HTML and the browser until their consent category is allowed.
- [Geography headers](./docs/frameworks/sveltekit/geography-headers.md): Which request headers SvelteKit's c15t helpers read for country, region, language and Global Privacy Control, how to trust them, and how to test another location.
- [Context getters](./docs/frameworks/sveltekit/getters.md): Reference for every @c15t/svelte context getter in SvelteKit components, from reading permissions and recorded choices to saving, the draft, IAB state and events.
- [Headless](./docs/frameworks/sveltekit/headless.md): Replace the c15t banner or preference dialog with your own markup in a SvelteKit app while the provider keeps policy, storage and script loading.
- [IAB TCF](./docs/frameworks/sveltekit/iab.md): Turn on the IAB TCF 2.4 banner and preference center in a SvelteKit app with IABConsentBanner, IABConsentDialog and the provider's iab option.
- [Network blocker](./docs/frameworks/sveltekit/network-blocker.md): Hold browser fetch and XMLHttpRequest calls to tracking domains in a SvelteKit app until their consent category is allowed, with the networkBlocker option.
- [Quickstart](./docs/frameworks/sveltekit/quickstart.md): Resolve consent in a SvelteKit root layout load so the c15t banner is in the server HTML, then hydrate the provider with consent-gated scripts and a preferences link.
- [Rendering and deployment](./docs/frameworks/sveltekit/rendering.md): Choose how a SvelteKit app resolves consent, on each request, from a cached manifest, or in the browser for prerendered pages, static sites and SPA mode, and deploy it to Node or edge adapters.
- [Scripts](./docs/frameworks/sveltekit/scripts.md): Load vendor scripts, iframes and network requests in a SvelteKit app only after the visitor allows their consent category, and stop them when consent is withdrawn.
- [Server API](./docs/frameworks/sveltekit/server-api.md): Reference for loadConsent, c15tHandle, createSvelteKitConsentRouteHandlers and resolveConsent from @c15t/svelte/kit and @c15t/svelte/server, with every option and default.
- [Translations](./docs/frameworks/sveltekit/translations.md): Change c15t banner and dialog copy in a SvelteKit app, where the server prefetch carries the backend's translations for the request's language.
- [Troubleshooting](./docs/frameworks/sveltekit/troubleshooting.md): Fix a banner missing from SvelteKit server HTML, failed saves through the manifest route, a wrong backend URL and ignored theme colors.
- [Vendor consent](./docs/frameworks/sveltekit/vendor-consent.md): Let visitors allow a category such as marketing in a SvelteKit app and still turn off one vendor in it, with the vendors prop on ConsentManagerProvider and getConsentManager.

### HTML script tag

- [window.c15t API](./docs/frameworks/html/api.md): Reference for window.c15t on a plain HTML page, covering the call queue, manual start, reading permissions and recorded choices, saving choices, opening the banner and dialog, and properties.
- [Script tag attributes](./docs/frameworks/html/attributes-and-api.md): Reference for the c15t script tag on plain HTML pages, covering the bundle files, every data attribute on the script tag, the DevTools tag and your own markup, and the modes the attributes select.
- [Callbacks](./docs/frameworks/html/callbacks.md): Run code on a plain HTML page when c15t resolves the policy, when a visitor records a choice, when permissions change or when a request fails, with window.c15t events, DOM events and config callbacks.
- [Clear on revocation](./docs/frameworks/html/clear-on-revocation.md): Delete the first-party cookies and Web Storage keys a consent category owns on a plain HTML page when that category is denied, with the clearOnRevocation option of the c15t script tag.
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
- [Vendor consent](./docs/frameworks/html/vendor-consent.md): Let visitors allow a category such as marketing on a plain HTML page and still turn off one vendor in it, with the vendors option, data-c15t-vendor on gated tags and the vendor switches in the c15t script tag's preference dialog.

### JavaScript

- [@c15t/browser API](./docs/frameworks/javascript/api/browser.md): Reference for the @c15t/browser ES module in a bundled JavaScript app, covering its entry points, init and createConsentClient, the client's methods and properties, events, page hooks and helper exports.
- [@c15t/browser options](./docs/frameworks/javascript/api/browser-options.md): Every option init() and createConsentClient() from @c15t/browser accept in a bundled JavaScript app, from the backend URL and mode to scripts, blockers, callbacks, storage, presentation and the stock UI.
- [Kernel API](./docs/frameworks/javascript/api/kernel.md): Reference for the c15t consent kernel in JavaScript, covering how to get or create one, its snapshot and subscriptions, commands, setters, hydration, events and listener ordering.
- [createConsentRuntime](./docs/frameworks/javascript/api/runtime.md): Reference for createConsentRuntime from c15t/runtime, the framework-agnostic consent runtime behind every c15t adapter, with every option, what start and dispose do, and the runtime handle's methods.
- [Consent snapshot](./docs/frameworks/javascript/api/snapshot.md): Reference for every field of the c15t consent snapshot a JavaScript app reads from the kernel, @c15t/browser or createConsentRuntime, grouped by the question each field answers.
- [Callbacks](./docs/frameworks/javascript/callbacks.md): Run code in a JavaScript app when a visitor records a consent choice, when permissions change, when a request fails or before the withdrawal reload, with c15t callbacks, client events and kernel events.
- [Clear on revocation](./docs/frameworks/javascript/clear-on-revocation.md): Delete the first-party cookies and Web Storage keys a consent category owns in a JavaScript app when that category is denied, with clearOnRevocation on init() or createConsentRuntime, or createClearOnRevocation on your own kernel.
- [Content Security Policy](./docs/frameworks/javascript/content-security-policy.md): Allow c15t in a JavaScript app under a Content Security Policy, covering backend requests, the stock UI's styles, nonces for vendor scripts and gated snippets, and embeds.
- [Customize](./docs/frameworks/javascript/customize.md): Change the stock @c15t/browser banner, preference dialog and floating trigger in a bundled JavaScript app with theme tokens, CSS, layout, copy, legal links and UI options.
- [DevTools](./docs/frameworks/javascript/dev-tools.md): Mount the c15t DevTools panel in a JavaScript app to inspect consent, scripts, policy and events for @c15t/browser, a consent runtime or a kernel.
- [Headless](./docs/frameworks/javascript/headless.md): Render your own consent banner and preferences in JavaScript, or connect a framework without a c15t adapter such as Solid, with createConsentRuntime from c15t/runtime.
- [IAB TCF](./docs/frameworks/javascript/iab.md): Add IAB TCF to a JavaScript app with the @c15t/browser IAB build, or attach the IAB module to a consent runtime or kernel you own.
- [Iframe blocker](./docs/frameworks/javascript/modules/iframe-blocker.md): Hold YouTube videos, maps and other embeds in a JavaScript app until their consent category is allowed, with data-src iframes and the c15t iframe blocker in @c15t/browser, createConsentRuntime or your own kernel.
- [Network blocker](./docs/frameworks/javascript/modules/network-blocker.md): Hold fetch and XMLHttpRequest calls in a JavaScript app until their consent category is allowed, with networkBlocker rules in @c15t/browser or createConsentRuntime, or createNetworkBlocker on your own kernel.
- [Persistence](./docs/frameworks/javascript/modules/persistence.md): How c15t stores consent choices in a JavaScript app, with the storage key, cookie domain and lifetime options, multi-tab sync, reconcile and clear, and createPersistence for your own kernel.
- [Script loader](./docs/frameworks/javascript/modules/script-loader.md): Reference for the c15t script loader in JavaScript, covering every Script field, lifecycle callbacks, updateScripts, disposal and createScriptLoader for a kernel you own.
- [Quickstart](./docs/frameworks/javascript/quickstart.md): Add the stock c15t banner, preferences and script gating to a JavaScript app built with Vite or another bundler, with no UI framework, using @c15t/browser.
- [Scripts](./docs/frameworks/javascript/scripts.md): Register vendor scripts with @c15t/browser, createConsentRuntime or a consent kernel in JavaScript, and control what happens when a visitor withdraws permission.
- [Translations](./docs/frameworks/javascript/translations.md): Choose the language of the c15t banner and preference dialog in a JavaScript app, change its wording with i18n, and add languages with @c15t/browser or createConsentRuntime.
- [Transports](./docs/frameworks/javascript/transports.md): Choose where a JavaScript app's c15t policy comes from and where choices go, with the hosted, manifest, offline and custom transports for @c15t/browser, createConsentRuntime and your own kernel.
- [Troubleshooting](./docs/frameworks/javascript/troubleshooting.md): Diagnose vendor scripts that run early, unexpected reloads, empty custom banners, CORS errors, duplicate consent owners and policy resolution in a JavaScript app that uses @c15t/browser or c15t/runtime.
- [Vendor consent](./docs/frameworks/javascript/vendor-consent.md): Let visitors allow a category such as marketing in a JavaScript app and still turn off one vendor in it, with the vendors option on createConsentRuntime and a vendor switch you render yourself.

## Concepts

- [Choose your setup](./docs/concepts/choose-your-setup.md): Pick the c15t setup for your framework, rendering mode and hosting, and decide who runs the consent backend.
- [Consent categories](./docs/concepts/consent-categories.md): Assign scripts, embeds and features to c15t consent categories, and understand which categories the preference dialog shows.
- [Consent state reference](./docs/concepts/consent-state.md): How c15t saves choices, gates IAB vendors, hydrates server records and keeps browser tabs and storage in step.
- [Data fetching](./docs/concepts/data-fetching.md): How c15t gets policy data through a cached manifest, backend /init, the browser or offline rules, and where consent choices are saved.
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

- [Migrate to v3](./docs/upgrade-v3.md): Upgrade a c15t v2 app to v3. Covers packages, the Next.js and React providers, the JavaScript runtime, custom UI built on useConsentManager, callbacks, policies, stored consent and a self-hosted backend.
