---
title: Google Tag
description: Load gtag.js for Google Analytics or Google Ads with c15t Consent
  Mode v2 signals, and verify the consent commands in DevTools.
icon: google-analytics
group: integrations
---

## Configure the Google tag

Copy the tag ID, for example `G-XXXXXXXXXX` for Google Analytics or
`AW-XXXXXXXXX` for Google Ads. Remove any `gtag.js` snippet already in your
HTML and any tag-manager entry that loads the same tag.

| Package manager | Command                                |
| :-------------- | :------------------------------------- |
| npm             | `npm install @c15t/integrations@alpha` |
| pnpm            | `pnpm add @c15t/integrations@alpha`    |
| yarn            | `yarn add @c15t/integrations@alpha`    |
| bun             | `bun add @c15t/integrations@alpha`     |

```ts title="src/consent-scripts.ts"
import { gtag } from '@c15t/integrations/google-tag';

export const scripts = [gtag({ id: 'G-XXXXXXXXXX', category: 'measurement' })];
```

## Register the scripts

Complete your [framework quickstart](https://c15t.com/docs/frameworks) first. Keep its Inth
endpoint, policy, styles and consent UI. Remove the vendor's original script,
SDK initializer or tag-manager entry, so the vendor loads only through c15t.

The vendor pages put the helper in `src/consent-scripts.ts`. If your framework
quickstart already has a `scripts` array, such as the one in `c15t.config.ts`
in the Next.js guide, add the helper to that array instead of creating a
second file.
The `scripts` export is a configuration, not an initializer. Add it to the c15t provider you already have, at the registration
point for your framework below. These are edits to that provider, not a second
provider.

**Next.js**

Add the configuration to `scripts` in `c15t.config.ts`, next to
`next.config.ts`:

```ts title="c15t.config.ts"
import { defineConsentConfig } from 'c15t/next';
import { scripts } from './src/consent-scripts';

export default defineConsentConfig({ scripts });
```

Keep the rest of your config, such as `mode` and `routePrefix`, in the
same call. `ConsentRoot` reads the config in the browser, so the layout
keeps passing only `state`. App Router, Pages Router and static export all
read the same file. See
[Next.js scripts and embeds](../frameworks/next/scripts.md).

**TanStack Start**

Import the configuration into your root route and pass it to the existing
`ConsentRoot` as a top-level prop. Keep the loader from the
[TanStack Start quickstart](https://c15t.com/docs/frameworks/tanstack-start/quickstart):

```tsx title="src/routes/__root.tsx"
import { scripts } from '../consent-scripts';

<ConsentRoot state={consent} scripts={scripts}>
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

`mode` is the `manifest()` value from the
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
callbacks. Write the vendor IDs into `consent-scripts.ts`. See
[Nuxt scripts and embeds](../frameworks/nuxt/scripts.md).

**Vue**

Pass the scripts to the existing `c15tVue` plugin call in `src/main.ts`:

```ts title="src/main.ts"
import { c15tVue, manifest } from 'c15t/vue/vue-plugin';
import { scripts } from './consent-scripts';

app.use(c15tVue, {
  mode: manifest(),
  scripts,
});
```

Keep your existing `mode` and other options. The plugin starts one
script loader when the app mounts, after it has applied the visitor's stored
choice. Do not also call `createScriptLoader` from a component. See
[Vue scripts and embeds](../frameworks/vue/scripts.md).

**Astro**

Add the scripts to the client entrypoint from the
[Astro quickstart](https://c15t.com/docs/frameworks/astro/quickstart), `src/c15t.client.ts`,
which the integration finds on its own. Keep `astro.config.mjs` as it is.
If the module already exports scripts, combine the two arrays.

```ts title="src/c15t.client.ts"
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
  import { ConsentProvider, manifest } from '@c15t/svelte';
  import { scripts } from './consent-scripts';
</script>

<ConsentProvider mode={manifest()} {scripts}>
  <!-- Keep your application, consent UI and preferences link here. -->
</ConsentProvider>
```

Retain the styles and consent UI from the [Svelte quickstart](https://c15t.com/docs/frameworks/svelte/quickstart).
The provider owns the loader and disposes it on unmount.

**SvelteKit**

Add the scripts to the existing `ConsentRoot` in the root layout. Keep the
handle and the layout load from the [SvelteKit quickstart](https://c15t.com/docs/frameworks/sveltekit/quickstart).

```svelte title="src/routes/+layout.svelte"
<script lang="ts">
  import { ConsentRoot } from '@c15t/svelte';
  import { scripts } from '../consent-scripts';

  let { children, data } = $props();
</script>

<ConsentRoot state={data.consent} {scripts}>
  {@render children()}
  <!-- Keep your consent UI and preferences link here. -->
</ConsentRoot>
```

Import vendor helpers in the layout component, not in `+layout.server.ts`:
a server load cannot send functions to the browser. Prerendered, static and
SPA-mode pages use the same `scripts` prop. If you pass an externally owned
`runtime` to the provider, register scripts when creating that runtime instead.

**HTML**

The helpers in `@c15t/integrations` are ES modules that need a bundler. On a
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
to a pasted snippet. See [HTML scripts](../frameworks/html/scripts.md).

**JavaScript**

Pass the scripts to `init()` from `@c15t/browser`, next to your mode:

```ts
import { init, manifest } from '@c15t/browser';
import { scripts } from './consent-scripts';

const consent = init({
  mode: manifest(),
  scripts,
});
```

Keep the mode from your quickstart. With
`createConsentRuntime` from `c15t/runtime`, pass `scripts` to it instead.
A kernel you create yourself needs a loader from
`c15t/modules/script-loader`. Attach one loader per kernel. See
[JavaScript scripts](../frameworks/javascript/scripts.md).

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

These checks are for the `gtag` helper, which loads before a choice on
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
