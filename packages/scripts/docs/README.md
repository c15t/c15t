# @c15t/scripts

> Consent-aware vendor integrations and Consent Mode loading contracts.

These docs ship inside the package so coding agents can read them offline. Open the topic file you need from the list below — paths are relative to this file.

## Using these docs

These docs describe v3. Start with Inth hosted setup, identify the framework, router and deployment, then read its quickstart. Static sites can use Inth directly. Use page Markdown and package-bundled docs for targeted context. Verify scripts, rejection, reload and preferences; banner visibility alone is insufficient.

## Start here

- [Quickstart](./guides/inth.md): Connect your application to Inth hosted consent management before installing the framework adapter.
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
- [Choose a deployment mode](./guides/deployment-modes.md): Choose backend ownership and request or browser initialization independently.
- [Quickstart](./guides/inth.md): Connect your application to Inth hosted consent management before installing the framework adapter.
- [Troubleshoot consent](./guides/troubleshooting.md): Diagnose missing banners, early vendor requests, lost choices and hydration differences.
- [Verify consent before shipping](./guides/verify-consent.md): Test requests, policy resolution, persistence, navigation and preference changes in a production build.

## Customization

- [Customize your consent interface](./customization/overview.md): Choose presentation, theme tokens, slots or custom markup for the change you need.
- [Banner styling recipes](./customization/recipes.md): See real v3 components and reuse the exact theme configuration behind the examples.
- [Style component slots](./customization/slots.md): Target a specific c15t component part without replacing its markup or behavior.
- [Theme tokens and CSS](./customization/tokens.md): Style c15t with semantic tokens and use the stylesheet that matches your CSS tooling.
- [Copy and translations](./customization/translations.md): Change consent wording through i18n and test the complete prompt and preferences flow.

## Integrations

- [Build a custom script integration](./integrations/building-integrations.md): Define loading, initialization and consent-change behavior for a vendor without a helper.
- [Consent-gated Google Maps embeds](./integrations/google-maps.md): Prevent a map iframe from mounting before the required permission.
- [Google Tag for GA4 and Ads](./integrations/google-tag.md): Configure gtag with c15t Consent Mode signals and understand its loading behavior.
- [Google Tag Manager and Consent Mode](./integrations/google-tag-manager.md): Load GTM with c15t consent signals and verify the tags inside your container.
- [Intercom messenger](./integrations/intercom.md): Load the Intercom messenger with functionality permission and configure its region.
- [Meta Pixel](./integrations/meta-pixel.md): Register the Meta Pixel under marketing permission and verify event calls after revocation.
- [Connect third-party services](./integrations/overview.md): Choose a vendor helper, understand its consent behavior and remove duplicate loading.

## Reference

- [Upgrade to v3 policies](./upgrade-v3.md): Migrate policy configuration, consent records, callbacks, and custom transports to the v3 policy system.
