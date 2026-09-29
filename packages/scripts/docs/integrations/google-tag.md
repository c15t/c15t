---
title: Google Tag
description: Load gtag.js for Google Analytics or Google Ads with c15t Consent
  Mode v2 signals, and verify the consent commands in DevTools.
group: integrations
---

## Configure the Google tag

Copy the tag ID, for example `G-XXXXXXXXXX` for Google Analytics or
`AW-XXXXXXXXX` for Google Ads. Remove any `gtag.js` snippet already in your
HTML and any tag-manager entry that loads the same tag.

| Package manager | Command                           |
| :-------------- | :-------------------------------- |
| npm             | `npm install @c15t/scripts@alpha` |
| pnpm            | `pnpm add @c15t/scripts@alpha`    |
| yarn            | `yarn add @c15t/scripts@alpha`    |
| bun             | `bun add @c15t/scripts@alpha`     |

```ts title="src/consent-scripts.ts"
import { gtag } from '@c15t/scripts/google-tag';

export const scripts = [gtag({ id: 'G-XXXXXXXXXX', category: 'measurement' })];
```

## Register the scripts

Complete your [framework quickstart](https://c15t.com/docs/frameworks) first. Keep its Inth
endpoint, policy, styles and consent UI. Remove the vendor's original script,
SDK initializer or tag-manager entry, so the vendor loads only through c15t.

The vendor pages put the helper in `src/consent-scripts.ts`. If your framework
quickstart already created a scripts file, such as `lib/scripts.ts` in the
Next.js guide, add the helper to that array instead of creating a second file.
The `scripts` export is a configuration, not an initializer. Add it to the c15t provider you already have, at the registration
point for your framework below. These are edits to that provider, not a second
provider.

**Next.js**

Import the configuration into the client boundary from your router guide:

```ts
import { ConsentRoot } from 'c15t/next';
import { scripts } from './consent-scripts';
```

Keep the server-resolved `state` and shared `consentConfig` from your
router guide. Its manifest, init and save URLs stay in effect. Add
`scripts` as a top-level prop on the existing root:

```tsx
<ConsentRoot state={state} config={consentConfig} scripts={scripts}>
  {children}
</ConsentRoot>
```

App Router, Pages Router and static export all use this `ConsentRoot` in
the `'use client'` wrapper `components/consent.tsx`. Keep `scripts` there,
because a Server Component cannot pass script callbacks to it. See
[Next.js scripts and embeds](../frameworks/next/scripts.md).

**TanStack Start**

Import the configuration into your root route and pass it to the existing
`ConsentRoot` as a top-level prop. Keep the loader, `backendURL` and
`initRoute` from the [TanStack Start quickstart](https://c15t.com/docs/frameworks/tanstack-start/quickstart):

```tsx title="src/routes/__root.tsx"
import { scripts } from '../consent-scripts';

<ConsentRoot
  state={consent}
  backendURL={backendURL}
  initRoute={false}
  scripts={scripts}
>
```

Import vendor helpers in the root route module, not in a server function.
A server function's return value must be serializable, and script
configurations carry callbacks. See
[TanStack Start scripts](../frameworks/tanstack-start/scripts.md).

**React**

Add the configuration to the existing `ConsentProvider` options, next to
`mode`:

```tsx title="src/consent.tsx"
import { scripts } from './consent-scripts';

<ConsentProvider options={{ mode, scripts }}>
```

`mode` is the `hosted({ url: backendURL })` value from the
[React quickstart](https://c15t.com/docs/frameworks/react/quickstart). Keep the banner,
dialog and preferences link inside the provider. See
[React scripts and embeds](../frameworks/react/scripts.md).

**Nuxt**

Register the scripts under the `c15t` key in `app/app.config.ts`. Adjust the
relative import to where you created `consent-scripts.ts`:

```ts title="app/app.config.ts"
import { scripts } from '../src/consent-scripts';

export default defineAppConfig({
  c15t: { scripts },
});
```

The Nuxt module merges this over its options in `nuxt.config.ts` and starts
one script loader in the browser after hydration, once it has applied the
visitor's stored choice and privacy signals. Keep `scripts` out of
`nuxt.config.ts`, which reaches the browser as JSON and drops the vendor
callbacks. `app.config.ts` cannot read `runtimeConfig`, so write the vendor
IDs into `consent-scripts.ts` or read them from `VITE_` variables. See
[Nuxt scripts and embeds](../frameworks/nuxt/scripts.md).

**Vue**

Pass the scripts to the existing `c15tVue` plugin call in `src/main.ts`:

```ts title="src/main.ts"
import { scripts } from './consent-scripts';

app.use(c15tVue, { backendURL, scripts });
```

Keep your existing backend URL and other options. The plugin starts one
script loader when the app mounts, after it has applied the visitor's stored
choice. Do not also call `createScriptLoader` from a component. See
[Vue scripts and embeds](../frameworks/vue/scripts.md).

**Astro**

Add the scripts to the client entrypoint from the
[Astro quickstart](https://c15t.com/docs/frameworks/astro/quickstart), the module that the
integration's `clientEntrypoint` option names. Keep `mode`, `ui` and the
framework integration in `astro.config.mjs` as they are. If the module
already exports scripts, combine the two arrays.

```ts title="src/consent-client.ts"
import type { C15tClientOptionsExtension } from 'c15t/astro';
import { scripts } from './consent-scripts';

export default { scripts } satisfies C15tClientOptionsExtension;
```

Vendor helpers contain callbacks, and the integration options in
`astro.config.mjs` are serialized into the page, so do not put helpers in
the integration's `scripts` option. The integration passes the client
entrypoint to the one runtime every page shares, including across
`ClientRouter` navigation.

**Svelte**

Import the scripts in the component that owns your existing provider and
pass them as a top-level prop:

```svelte title="src/App.svelte"
<script lang="ts">
  import { ConsentManagerProvider, hosted } from '@c15t/svelte';
  import { scripts } from './consent-scripts';

  const backendURL = import.meta.env.VITE_C15T_BACKEND_URL;
  if (!backendURL) throw new Error('Set VITE_C15T_BACKEND_URL');
  const mode = hosted({ url: backendURL });
</script>

<ConsentManagerProvider {mode} {scripts}>
  <!-- Keep your application, consent UI and preferences link here. -->
</ConsentManagerProvider>
```

Retain the styles and consent UI from the [Svelte quickstart](https://c15t.com/docs/frameworks/svelte/quickstart).
The provider owns the loader and disposes it on unmount.

**SvelteKit**

Add the scripts to the existing root layout provider. Keep the server load
and its serializable prefetch data from the [SvelteKit quickstart](https://c15t.com/docs/frameworks/sveltekit/quickstart).

```svelte title="src/routes/+layout.svelte"
<script lang="ts">
  import { env } from '$env/dynamic/public';
  import { ConsentManagerProvider, hosted } from '@c15t/svelte';
  import { scripts } from '../consent-scripts';

  let { children, data } = $props();
  const mode = hosted({ url: env.PUBLIC_C15T_BACKEND_URL });
</script>

<ConsentManagerProvider {mode} {scripts} prefetch={data.prefetch}>
  {@render children()}
  <!-- Keep your consent UI and preferences link here. -->
</ConsentManagerProvider>
```

Import vendor helpers in the layout component, not in `+layout.server.ts`:
a server load cannot send functions to the browser. Prerendered, static and
SPA-mode pages use the same `scripts` prop. If you pass an externally owned
`runtime` to the provider, register scripts when creating that runtime instead.

**HTML**

The helpers in `@c15t/scripts` are ES modules that need a bundler. On a
page that loads the c15t script tag, paste the vendor's own snippet instead
and keep it inert until its category is allowed:

```html
<script type="text/plain" data-c15t-category="measurement">
  // The vendor's snippet, unchanged
</script>
```

Use the category this guide names for the vendor. c15t runs the snippet
once that category is allowed, and reloads the page when the visitor
withdraws it. Helper options on this page, such as `loadMode`, do not apply
to a pasted snippet. See [HTML scripts and embeds](../frameworks/html/scripts.md).

**JavaScript**

Pass the scripts to `init()` from `@c15t/browser`, next to your backend
URL:

```ts
import { init } from '@c15t/browser';
import { scripts } from './consent-scripts';

const consent = init({ backendURL, scripts });
```

`backendURL` is the Inth URL from your quickstart. With
`createConsentRuntime` from `c15t/runtime`, pass `scripts` to it instead.
A kernel you create yourself needs a loader from
`c15t/modules/script-loader`. Attach one loader per kernel. See
[JavaScript scripts](../frameworks/javascript/scripts.md).

**React Native**

There is no script loader to register. `@c15t/scripts` loads browser
documents, and a React Native app has none: the consent kernel runs natively
and the vendor ships as a native or JavaScript module you start yourself.

Gate the vendor where you start it, so the module never initialises without
permission:

```tsx
import { ConsentGate } from '@c15t/react-native';

export function VendorInit() {
  return <ConsentGate category="measurement">{() => <VendorSDK />}</ConsentGate>;
}
```

An SDK you start outside React reads the same snapshot natively and has to
check it there too. See
[React Native setup](https://c15t.com/docs/frameworks/react-native/quickstart).

## Options

| Option           | Default         | Behavior                                                                                                                                               |
| ---------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`             | Required        | Tag ID passed to `gtag('config', ...)` and the loader URL. The helper trims it. Empty or whitespace-only values throw.                                 |
| `category`       | Required        | `measurement` for Analytics, `marketing` for Ads and Floodlight. It sets the script's permission, which callbacks receive, but does not delay loading. |
| `config`         | None            | Parameters passed as the third argument to `gtag('config', id, config)`.                                                                               |
| `consentMapping` | The table below | Replaces the category-to-Google mapping.                                                                                                               |

The deprecated `script` option overrides fields of the returned script. Use the
options above instead.

## Google loads before a choice

The `googleTagManager` and `gtag` helpers set `alwaysLoad: true`. Before the
visitor chooses, the helper creates the `dataLayer` queue, sends
`gtag('consent', 'default', ...)` with the current permissions and loads
Google's script. After each permission change it sends
`gtag('consent', 'update', ...)`. Google's tags then adjust what they store and
send; see Google's
[Consent Mode overview](https://developers.google.com/tag-platform/security/concepts/consent-mode).

So the browser does contact Google before consent. If your policy requires no
Google request until the visitor allows it, do not use these helpers unchanged.

## How categories map to Google consent types

| c15t category   | Google consent types                               |
| --------------- | -------------------------------------------------- |
| `necessary`     | `security_storage`                                 |
| `functionality` | `functionality_storage`                            |
| `measurement`   | `analytics_storage`                                |
| `marketing`     | `ad_storage`, `ad_user_data`, `ad_personalization` |
| `experience`    | `personalization_storage`                          |

Each Google type is `granted` when its category is allowed and `denied`
otherwise. If a visitor turns off the helper's vendor, every optional type is
sent as `denied`. The `consentMapping` option replaces the whole table, so
include every category you still want signalled.

Under an opt-out policy, the default command can grant types before the
visitor has chosen anything. That is a permission, not a recorded choice.

## Verify the Google tag

These checks are for the `googleTag` helper, which loads before a choice on
purpose. On a plain HTML page with the script tag, you gate Google's snippet
instead and it loads only after consent; see
[HTML scripts](../frameworks/html/scripts.md#google-consent-mode-and-tag-managers).

1. In a private window with an opt-in policy, load the page. `gtag/js` loads.
   In Google Tag Assistant, the `consent` `default` command comes before
   `config`, with `analytics_storage` and `ad_storage` set to `denied`.
2. Open Privacy settings and allow the tag's category. Tag Assistant shows an
   `update` command that grants the mapped types.
3. Turn the category off again and save. c15t reloads the page, and the new
   page starts with those types denied.
4. With client-side navigation, check that each route change sends one page
   view. A separate router integration that also sends `page_view` doubles
   the count.

See the [consent verification guide](../guides/verify-consent.md) for hosting
checks.
