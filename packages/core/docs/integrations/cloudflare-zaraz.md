---
title: Cloudflare Zaraz
description: Sync c15t permissions to Cloudflare Zaraz purposes with the c15t
  cloudflareZaraz bridge, which runs on every page without loading a script, and
  check the tools it controls.
group: integrations
---

## Configure Cloudflare Zaraz

`cloudflareZaraz` connects c15t to an existing Zaraz installation. It inserts
no script and configures no tools. Zaraz loads the tools; c15t decides which
purposes they may use. In the Zaraz dashboard:

1. Enable Consent Management and create purposes for the c15t categories you
   use.
2. Assign a purpose to every tool that needs permission. Zaraz runs a tool
   without a purpose regardless of consent.
3. Turn off automatic display of the Zaraz consent modal. c15t owns the UI.
4. Turn off **Automatic Pageview Tracking**, and automatic SPA pageviews too if
   your app sends them itself.
5. Copy the purpose IDs, not the purpose names, into the mapping below.

Zaraz keeps its own consent cookie. An automatic pageview can run with a grant
from a previous visit before c15t applies the current permissions. With
automatic pageviews off, send the first pageview from `onReady`, which runs
after the first synchronization. DOM-ready, timer and click triggers you add in
Zaraz can still run before the bridge starts; audit them. Cloudflare documents
[purpose assignment](https://developers.cloudflare.com/zaraz/consent-management/)
and [pageview settings](https://developers.cloudflare.com/zaraz/reference/settings/).

| Package manager | Command                           |
| :-------------- | :-------------------------------- |
| npm             | `npm install @c15t/scripts@alpha` |
| pnpm            | `pnpm add @c15t/scripts@alpha`    |
| yarn            | `yarn add @c15t/scripts@alpha`    |
| bun             | `bun add @c15t/scripts@alpha`     |

```ts title="src/consent-scripts.ts"
import { cloudflareZaraz } from '@c15t/scripts/cloudflare-zaraz';

// Zaraz provides this global after its loader runs.
declare const zaraz: { track: (event: string) => void };

export const scripts = [
  cloudflareZaraz({
    purposes: {
      measurement: ['your-measurement-purpose-id'],
      marketing: ['your-marketing-purpose-id'],
    },
    onReady: () => {
      zaraz.track('Pageview');
    },
  }),
];
```

Register one bridge per app. Keep Zaraz's own loader and its dashboard tools
when you follow the registration steps below; remove only standalone loaders
for tools that Zaraz already runs, including a separate `@c15t/scripts` helper
for the same tool. If Zaraz auto-injection is off, load
[Zaraz manually](https://developers.cloudflare.com/zaraz/advanced/load-zaraz-manually/)
once.

## Register the scripts

Complete your [framework quickstart](https://c15t.com/docs/frameworks) first. Keep its Inth
endpoint, policy, styles and consent UI. Remove the vendor's original script,
SDK initializer or tag-manager entry, so the vendor loads only through c15t.

The `scripts` export in `src/consent-scripts.ts` is a configuration, not an
initializer. Add it to the c15t provider you already have, at the registration
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
[Next.js scripts and embeds](https://c15t.com/docs/frameworks/next/scripts).

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
[TanStack Start scripts](https://c15t.com/docs/frameworks/tanstack-start/scripts).

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
[React scripts and embeds](https://c15t.com/docs/frameworks/react/scripts).

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
[Nuxt scripts and embeds](https://c15t.com/docs/frameworks/nuxt/scripts).

**Vue**

Pass the scripts to the existing `c15tVue` plugin call in `src/main.ts`:

```ts title="src/main.ts"
import { scripts } from './consent-scripts';

app.use(c15tVue, { backendURL, scripts });
```

Keep your existing backend URL and other options. The plugin starts one
script loader when the app mounts, after it has applied the visitor's stored
choice. Do not also call `createScriptLoader` from a component. See
[Vue scripts and embeds](https://c15t.com/docs/frameworks/vue/scripts).

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
to a pasted snippet. See [HTML scripts and embeds](https://c15t.com/docs/frameworks/html/scripts).

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

| Option             | Default  | Behavior                                                                                                                                                                  |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `purposes`         | Required | Maps c15t categories to Zaraz purpose IDs. A category can list several IDs. An empty mapping, a blank ID, an ID with surrounding whitespace or an ID mapped twice throws. |
| `hideBuiltInModal` | `true`   | Hides the Zaraz modal if it is visible. Also turn off auto-display in Zaraz.                                                                                              |
| `sendQueuedEvents` | `true`   | Calls `zaraz.consent.sendQueuedEvents()` after a purpose changes from denied to allowed. Set `false` to discard pageviews Zaraz queued before consent.                    |
| `onReady`          | None     | Runs once after the first successful synchronization, even when every purpose is denied.                                                                                  |
| `onError`          | None     | Receives synchronization errors.                                                                                                                                          |

## Loading and revocation

`cloudflareZaraz` returns a callback-only script with the `necessary` category
and `alwaysLoad`, so the bridge runs for every visitor. That does not make the
tools behind it necessary. The bridge declares no c15t vendor; control each
tool through its Zaraz purpose.

When the Zaraz consent API is ready, the bridge reads `zaraz.consent.getAll()`
and sets each returned purpose to `true` only if its mapped category is
allowed in c15t's effective permissions, which include policy restrictions.
Purposes you did not map are set to `false`. If the API is not ready,
the bridge waits for the `zarazConsentAPIReady` event and applies the latest
permissions; it does not poll. On each consent change it calls
`zaraz.consent.set()` only when a value differs, then replays queued events
for newly allowed purposes. Revocation sets purposes to `false` and replays
nothing. Zaraz returns only purposes attached to enabled tools, so a mapped ID
missing from `getAll()` gets no grant.

If a Zaraz call throws, `onReady` waits and the bridge retries on the next
consent change or readiness event. Without `onError`, the error reaches the
script loader's debug events, or the browser's error handler for readiness
events. A failed revocation can leave the previous Zaraz grant in place, and a
retried replay can send a queued event twice. Disposing the loader detaches the
bridge but does not revoke purposes or stop tools that already ran. The bridge
maps categories to purposes only; it does not translate IAB TCF choices.

## Verify Cloudflare Zaraz

Test with isolated destinations. `getAll()` shows what the bridge set, but only
a tool's own requests show whether it respected that.

1. In a private window with an opt-in policy, load the page. The bridge adds
   no script element. `zaraz.consent.getAll()` returns `false` for every
   purpose, the Zaraz modal stays hidden, and no purpose-gated tool sends a
   request.
2. Click Reject, then reload. Every purpose is still `false`.
3. Open Privacy settings and allow measurement. Without a reload, the
   measurement purposes become `true`, the queued pageview replays and
   measurement tools send requests. Marketing tools stay silent.
4. Turn measurement off again and save. c15t reloads the page, and the new
   page starts with every purpose `false`.
5. In the console, call `zaraz.consent.set()` to grant a purpose that c15t
   denies, then reload. The bridge sets it back to `false` before `onReady`
   runs.

[Cloudflare Web Analytics](./cloudflare-web-analytics.md) is a
separate product with its own helper. See the
[consent verification guide](../guides/verify-consent.md) for navigation and
hosting checks.
