# c15t

> c15t v3 framework integration and consent management. Examples use scoped imports; the umbrella export map provides corresponding framework subpaths.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Using these docs

These docs describe v3. Start with Inth hosted setup, identify the framework, router and deployment, then read its quickstart. Static sites can use Inth directly. Use page Markdown and package-bundled docs for targeted context. Verify scripts, rejection, reload and preferences; banner visibility alone is insufficient.

## Start here

- [Start with Inth](./docs/guides/inth.md): Connect your application to Inth hosted consent management before installing the framework adapter.
- [Choose your c15t integration](./docs/frameworks/index.md): Find the c15t v3 setup for your framework, router and deployment.
- [Customize your consent interface](./docs/customization/overview.md): Choose presentation, theme tokens, slots or custom markup for the change you need.
- [Verify consent before shipping](./docs/guides/verify-consent.md): Test requests, policy resolution, persistence, navigation and preference changes in a production build.
- [Upgrade to v3 policies](./docs/upgrade-v3.md): Migrate policy configuration, consent records, callbacks, and custom transports to the v3 policy system.

## More documentation

[Documentation index](https://c15t.com/docs/llms.txt) · [Full Markdown context](https://c15t.com/llms-full.txt). Prefer the index and individual pages for focused tasks.

## Frameworks

- [Choose your c15t integration](./docs/frameworks/index.md): Find the c15t v3 setup for your framework, router and deployment.
- [Astro consent setup](./docs/frameworks/astro/quickstart.md): Add c15t to static or server-rendered Astro pages and choose the framework used by preference dialogs.
- [Consent kernel API](./docs/frameworks/javascript/api/overview.md): Use the kernel for policy resolution, state subscriptions and explicit consent commands.
- [Build a framework integration](./docs/frameworks/javascript/building-ui.md): Connect c15t state to a custom framework without duplicating runtime ownership.
- [Consent categories](./docs/frameworks/javascript/concepts/consent-categories.md): Assign optional features to categories and understand how policy scope affects permission.
- [Policy presets](./docs/frameworks/javascript/concepts/policy-presets.md): Choose consent behavior for your processing, with regional rules and no-banner options.
- [DevTools](./docs/frameworks/javascript/dev-tools.md): Inspect a JavaScript consent kernel with the imperative DevTools API.
- [Headless IAB integration](./docs/frameworks/javascript/iab/overview.md): Attach the IAB module to a consent kernel and manage its lifetime and vendor configuration.
- [JavaScript consent setup](./docs/frameworks/javascript/quickstart.md): Connect a headless JavaScript consent engine to Inth and own its UI and lifecycle.
- [JavaScript script loading](./docs/frameworks/javascript/script-loader.md): Attach a script loader to the consent kernel and dispose it with the application.
- [Troubleshoot JavaScript consent](./docs/frameworks/javascript/troubleshooting.md): Diagnose policy resolution, early scripts, storage and rendering problems.
- [Next.js App Router](./docs/frameworks/next/app-router.md): Resolve consent per request and hydrate the same state in a Next.js App Router layout.
- [ConsentBanner](./docs/frameworks/next/components/consent-banner.md): Pre-built consent banner shown when consent is required.
- [ConsentDialogTrigger](./docs/frameworks/next/components/consent-dialog-trigger.md): Floating button and toolbar that reopen the preference center after the first prompt.
- [ConsentProvider](./docs/frameworks/next/components/consent-manager-provider.md): Configure the v3 consent runtime and share its state with child components.
- [DevTools](./docs/frameworks/next/components/dev-tools.md): A development tool for inspecting consent state, geolocation, loaded scripts, and consent events in real time.
- [Consent categories](./docs/frameworks/next/concepts/consent-categories.md): Assign optional features to categories and understand how policy scope affects permission.
- [Policy presets](./docs/frameworks/next/concepts/policy-presets.md): Choose consent behavior for your processing, with regional rules and no-banner options.
- [Headless](./docs/frameworks/next/headless.md): Build your own consent UI on top of the c15t hooks.
- [Read and update consent](./docs/frameworks/next/hooks/use-consent-manager/overview.md): Choose focused consent hooks for feature gates, explicit choices and preference actions.
- [IAB TCF integration](./docs/frameworks/next/iab/overview.md): Configure the IAB provider, policy and vendor data before rendering the TCF interface.
- [Next.js Pages Router](./docs/frameworks/next/pages-router.md): Use request prefetch in getServerSideProps or initialize consent in the browser for Pages Router apps.
- [Next.js consent setup](./docs/frameworks/next/quickstart.md): Choose App Router, Pages Router or static export before adding c15t to Next.js.
- [Load scripts with consent](./docs/frameworks/next/script-loader.md): Register vendor scripts once and let effective permissions control loading.
- [Server rendering and hydration](./docs/frameworks/next/server-side.md): Choose request helpers for your Next.js router and preserve the prepared consent configuration.
- [Next.js static export](./docs/frameworks/next/static-export.md): Add c15t to output export without request helpers or a local API server.
- [Styling](./docs/frameworks/next/styling/overview.md): Theme c15t components with tokens, slots, and class names.
- [Troubleshoot Next.js consent](./docs/frameworks/next/troubleshooting.md): Diagnose policy resolution, early scripts, storage and rendering problems.
- [Nuxt consent setup](./docs/frameworks/nuxt/quickstart.md): Configure the Nuxt module for server rendering, browser initialization or static hosting.
- [ConsentBanner](./docs/frameworks/react/components/consent-banner.md): Pre-built consent banner shown when consent is required.
- [ConsentDialogTrigger](./docs/frameworks/react/components/consent-dialog-trigger.md): Floating button and toolbar that reopen the preference center after the first prompt.
- [ConsentProvider](./docs/frameworks/react/components/consent-manager-provider.md): Configure the v3 consent runtime and share its state with child components.
- [DevTools](./docs/frameworks/react/components/dev-tools.md): A development tool for inspecting consent state, geolocation, loaded scripts, and consent events in real time.
- [Consent categories](./docs/frameworks/react/concepts/consent-categories.md): Assign optional features to categories and understand how policy scope affects permission.
- [Policy presets](./docs/frameworks/react/concepts/policy-presets.md): Choose consent behavior for your processing, with regional rules and no-banner options.
- [Headless](./docs/frameworks/react/headless.md): Build your own consent UI on top of the c15t hooks.
- [Read and update consent](./docs/frameworks/react/hooks/use-consent-manager/overview.md): Choose focused consent hooks for feature gates, explicit choices and preference actions.
- [IAB TCF integration](./docs/frameworks/react/iab/overview.md): Configure the IAB provider, policy and vendor data before rendering the TCF interface.
- [React consent setup](./docs/frameworks/react/quickstart.md): Connect a React application to Inth and add consent UI, persistence and a preferences link.
- [Load scripts with consent](./docs/frameworks/react/script-loader.md): Register vendor scripts once and let effective permissions control loading.
- [Styling](./docs/frameworks/react/styling/overview.md): Theme c15t components with tokens, slots, and class names.
- [Troubleshoot React consent](./docs/frameworks/react/troubleshooting.md): Diagnose policy resolution, early scripts, storage and rendering problems.
- [Svelte consent setup](./docs/frameworks/svelte/quickstart.md): Mount c15t components and a persistent preferences link in a Svelte 5 application.
- [SvelteKit consent setup](./docs/frameworks/sveltekit/quickstart.md): Resolve consent in a SvelteKit server load and hydrate the provider, or initialize in the browser on static hosting.
- [TanStack Start consent setup](./docs/frameworks/tanstack-start/quickstart.md): Resolve consent through a Start server function and hydrate it through the root route.
- [Vue consent setup](./docs/frameworks/vue/quickstart.md): Install c15t in a plain Vue 3 application with the Vite plugin and consent root.

## Guides

- [Understand consent state](./docs/guides/consent-state.md): Distinguish policy resolution, effective permissions, explicit choices, notices and privacy signals.
- [Choose a deployment mode](./docs/guides/deployment-modes.md): Choose backend ownership and request or browser initialization independently.
- [Start with Inth](./docs/guides/inth.md): Connect your application to Inth hosted consent management before installing the framework adapter.
- [Troubleshoot consent](./docs/guides/troubleshooting.md): Diagnose missing banners, early vendor requests, lost choices and hydration differences.
- [Verify consent before shipping](./docs/guides/verify-consent.md): Test requests, policy resolution, persistence, navigation and preference changes in a production build.

## Customization

- [Customize your consent interface](./docs/customization/overview.md): Choose presentation, theme tokens, slots or custom markup for the change you need.
- [Banner styling recipes](./docs/customization/recipes.md): See real v3 components and reuse the exact theme configuration behind the examples.
- [Style component slots](./docs/customization/slots.md): Target a specific c15t component part without replacing its markup or behavior.
- [Theme tokens and CSS](./docs/customization/tokens.md): Style c15t with semantic tokens and use the stylesheet that matches your CSS tooling.
- [Copy and translations](./docs/customization/translations.md): Change consent wording through i18n and test the complete prompt and preferences flow.

## Integrations

- [Build a custom script integration](./docs/integrations/building-integrations.md): Define loading, initialization and consent-change behavior for a vendor without a helper.
- [Consent-gated Google Maps embeds](./docs/integrations/google-maps.md): Prevent a map iframe from mounting before the required permission.
- [Google Tag for GA4 and Ads](./docs/integrations/google-tag.md): Configure gtag with c15t Consent Mode signals and understand its loading behavior.
- [Google Tag Manager and Consent Mode](./docs/integrations/google-tag-manager.md): Load GTM with c15t consent signals and verify the tags inside your container.
- [Intercom messenger](./docs/integrations/intercom.md): Load the Intercom messenger with functionality permission and configure its region.
- [Meta Pixel](./docs/integrations/meta-pixel.md): Register the Meta Pixel under marketing permission and verify event calls after revocation.
- [Connect third-party services](./docs/integrations/overview.md): Choose a vendor helper, understand its consent behavior and remove duplicate loading.

## Reference

- [Upgrade to v3 policies](./docs/upgrade-v3.md): Migrate policy configuration, consent records, callbacks, and custom transports to the v3 policy system.
