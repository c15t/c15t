# @c15t/core

> Headless v3 consent, Inth setup, runtime ownership and script loading.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Using these docs

These docs describe v3. Start with Inth hosted setup, identify the framework, router and deployment, then read its quickstart. Static sites can use Inth directly. Use page Markdown and package-bundled docs for targeted context. Verify scripts, rejection, reload and preferences; banner visibility alone is insufficient.

## Start here

- [Quickstart](./docs/guides/inth.md): Connect your application to Inth hosted consent management before installing the framework adapter.
- [Customize your consent interface](./docs/customization/overview.md): Choose presentation, theme tokens, slots or custom markup for the change you need.
- [Verify consent before shipping](./docs/guides/verify-consent.md): Test requests, policy resolution, persistence, navigation and preference changes in a production build.
- [Upgrade to v3 policies](./docs/upgrade-v3.md): Migrate policy configuration, consent records, callbacks, and custom transports to the v3 policy system.

## More documentation

[Documentation index](https://c15t.com/docs/llms.txt) · [Full Markdown context](https://c15t.com/llms-full.txt). Prefer the index and individual pages for focused tasks.

## Frameworks

- [Consent kernel API](./docs/frameworks/javascript/api/overview.md): Use the kernel for policy resolution, state subscriptions and explicit consent commands.
- [Build a framework integration](./docs/frameworks/javascript/building-ui.md): Connect c15t state to a custom framework without duplicating runtime ownership.
- [Consent categories](./docs/frameworks/javascript/concepts/consent-categories.md): Assign optional features to categories and understand how policy scope affects permission.
- [Policy presets](./docs/frameworks/javascript/concepts/policy-presets.md): Choose consent behavior for your processing, with regional rules and no-banner options.
- [DevTools](./docs/frameworks/javascript/dev-tools.md): Inspect a JavaScript consent kernel with the imperative DevTools API.
- [Headless IAB integration](./docs/frameworks/javascript/iab/overview.md): Attach the IAB module to a consent kernel and manage its lifetime and vendor configuration.
- [Quickstart](./docs/frameworks/javascript/quickstart.md): Connect a headless JavaScript consent engine to Inth and own its UI and lifecycle.
- [JavaScript script loading](./docs/frameworks/javascript/script-loader.md): Attach a script loader to the consent kernel and dispose it with the application.
- [Troubleshoot JavaScript consent](./docs/frameworks/javascript/troubleshooting.md): Diagnose policy resolution, early scripts, storage and rendering problems.

## Guides

- [Understand consent state](./docs/guides/consent-state.md): Distinguish policy resolution, effective permissions, explicit choices, notices and privacy signals.
- [Choose a deployment mode](./docs/guides/deployment-modes.md): Choose backend ownership and request or browser initialization independently.
- [Quickstart](./docs/guides/inth.md): Connect your application to Inth hosted consent management before installing the framework adapter.
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
