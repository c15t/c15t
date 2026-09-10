---
title: Google Tag Manager
description: Load GTM with c15t consent signals and verify the tags inside your container.
group: integrations
---

## Register the container

| Package manager | Command                     |
| :-------------- | :-------------------------- |
| npm             | `npm install @c15t/scripts` |
| pnpm            | `pnpm add @c15t/scripts`    |
| yarn            | `yarn add @c15t/scripts`    |
| bun             | `bun add @c15t/scripts`     |

```ts title="src/consent-scripts.ts"
import { googleTagManager } from '@c15t/scripts/google-tag-manager';

export const scripts = [googleTagManager({ id: 'GTM-XXXXXXX' })];
```

Replace the container ID and pass `scripts` to your existing provider options.
Remove the previous GTM snippet and any duplicate framework integration. The
helper sends a `consent-update` event after consent changes; `updateEventName`
customizes that event name.

## Register the scripts

Complete your [framework quickstart](https://c15t.com/docs/frameworks) first. Keep its Inth
endpoint, policy, styles and consent UI. Remove the vendor's original script,
SDK initializer or tag-manager entry so c15t owns loading once.

The `scripts` export in `src/consent-scripts.ts` is a configuration, not an
initializer. Add it to your existing consent owner using the registration point
below. These are partial edits to that owner, not additional providers.

**React**

Import `scripts` into your existing provider component:

```ts
import { scripts } from './consent-scripts';
```

Keep the existing options and add `scripts` to `ConsentProvider` from
`c15t/react`:

```tsx
<ConsentProvider options={{ ...consentOptions, scripts }}>
  {children}
</ConsentProvider>
```

Here `consentOptions` is your existing configuration, including
`mode: hosted({ url: backendURL })`. Keep the banner, dialog and preferences
link inside the provider. See [React script loading](../frameworks/react/script-loader.md).

**Next.js**

Import `scripts` into the client boundary from your router guide:

```ts
import { scripts } from './consent-scripts';
```

A server-prefetched `ConsentBoundary` from `c15t/next` takes `scripts` as a
top-level prop. Keep its existing props, server wrapper and children.

```tsx
<ConsentBoundary config={config} backendURL={backendURL} scripts={scripts}>
  {children}
</ConsentBoundary>
```

If your Pages Router or static-export setup uses `ConsentProvider` instead,
put `scripts` in its `options`, as in the React tab. Do not replace that
setup with a request-time route on a static host. See
[Next.js script loading](../frameworks/next/script-loader.md).

**JavaScript**

Attach the loader to your existing kernel before calling
`kernel.commands.init()`:

```ts
import { createScriptLoader } from 'c15t/modules/script-loader';
import { scripts } from './consent-scripts';

const loader = createScriptLoader({ kernel, scripts });
```

Call `loader.dispose()` when that application instance is destroyed.
`kernel` is the hosted kernel from your quickstart. A provider-owned kernel
already has a loader; do not attach a second one. See
[JavaScript script loading](../frameworks/javascript/script-loader.md).

For other adapters, use the registration location appropriate to that framework:

| Adapter                                                                                                                             | Registration location                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Vue](https://c15t.com/docs/frameworks/vue/quickstart)                                                                              | Browser plugin configuration used by the existing consent runtime.                                                                                   |
| [Nuxt](https://c15t.com/docs/frameworks/nuxt/quickstart)                                                                            | `app.config.ts` under `c15t.scripts`. Keep helper callbacks out of serialized runtime config.                                                        |
| [Svelte](https://c15t.com/docs/frameworks/svelte/quickstart) and [SvelteKit](https://c15t.com/docs/frameworks/sveltekit/quickstart) | The existing `ConsentManagerProvider`'s `scripts` prop, or the shared runtime's options when it owns the provider.                                   |
| [Astro](https://c15t.com/docs/frameworks/astro/quickstart)                                                                          | Export `{ scripts }` from the module selected by `clientEntrypoint`. Helpers contain callbacks that cannot be serialized through `astro.config.mjs`. |
| [TanStack Start](https://c15t.com/docs/frameworks/tanstack-start/quickstart)                                                        | The existing `ConsentBoundary`'s top-level `scripts` prop, keeping its loader-prefetched configuration.                                              |

## Consent Mode is not a zero-request gate

This helper sets `alwaysLoad: true`. It prepares the Google queue, sends consent
defaults and updates, and loads Google's script even before a visitor makes a
choice. That is different from preventing any request to Google until consent.
Google describes the distinction in its
[Consent Mode overview](https://developers.google.com/tag-platform/security/concepts/consent-mode).

The default mapping is:

| c15t category   | Google consent types                               |
| --------------- | -------------------------------------------------- |
| `necessary`     | `security_storage`                                 |
| `functionality` | `functionality_storage`                            |
| `measurement`   | `analytics_storage`                                |
| `marketing`     | `ad_storage`, `ad_user_data`, `ad_personalization` |
| `experience`    | `personalization_storage`                          |

`consentMapping` replaces the mapping when supplied. Keep the full set of
signals your integration needs. Test both default and update commands and the
actual tag behavior. Do not infer a saved grant from an allowed default under an
opt-out policy.

## Configure the container too

Loading GTM with consent signals does not make every custom tag consent-aware.
Configure the appropriate consent checks and triggers for tags inside the
container. Inspect their requests after rejection and revocation, including
non-Google tags. Use Google Tag Assistant alongside the browser Network panel.

If the requirement is no Google request before permission, do not deploy this
always-loaded helper unchanged. Choose and verify an explicitly gated setup.
