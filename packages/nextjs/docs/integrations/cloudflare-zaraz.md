---
title: Cloudflare Zaraz
description: Synchronize c15t permissions with Zaraz purposes while Cloudflare
  manages your tools.
group: integrations
---

## Configure Zaraz before registering the bridge

This helper connects c15t to an existing Zaraz installation. It does not insert a
script, configure Cloudflare tools, or turn a standalone SDK into a server-side
integration. Configure each tool in Zaraz and remove its previous standalone
loader, including any duplicate `@c15t/scripts` helper.

In the Zaraz dashboard:

1. Enable Consent Management and create purposes for the categories you use.
2. Assign a purpose to every tool requiring permission. Zaraz tools without a
   purpose bypass consent checks.
3. Disable automatic display of the Zaraz consent modal. c15t owns the UI.
4. Disable **Automatic Pageview Tracking**. Disable automatic SPA pageviews too
   if your application will emit them itself.
5. Copy the purpose IDs into the mapping below. Every active purpose returned by `zaraz.consent.getAll()` and omitted
   from the mapping is denied by this bridge. Register one bridge per application.

Zaraz keeps a separate consent cookie. Its automatic pageview can run before
c15t resolves the current permissions, using a grant from a previous visit.
Disabling that pageview and emitting it from `onReady` prevents this particular
startup race. Do not send other events before synchronization, and audit any
custom triggers that run independently. DOM-ready, timer or click triggers can
run with stale permissions before the bridge mounts. The bridge cannot undo
requests sent before it starts.

Cloudflare documents [purpose assignment](https://developers.cloudflare.com/zaraz/consent-management/)
and [automatic pageview settings](https://developers.cloudflare.com/zaraz/reference/settings/).

## Register the consent bridge

| Package manager | Command                     |
| :-------------- | :-------------------------- |
| npm             | `npm install @c15t/scripts` |
| pnpm            | `pnpm add @c15t/scripts`    |
| yarn            | `yarn add @c15t/scripts`    |
| bun             | `bun add @c15t/scripts`     |

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

Use actual IDs from your dashboard, not the purpose names. A category may map to
several purposes, but a purpose cannot appear more than once. Empty mappings,
blank IDs and duplicate IDs throw during construction. Zaraz only returns purposes attached to enabled tools from `getAll()`. IDs absent
from that result cannot receive a grant; compare the mapping with
`zaraz.consent.getAll()` when troubleshooting.

Include the mapped categories in your c15t policy. The bridge reads effective
permissions, including policy restrictions, rather than treating every allowed
category as a recorded visitor choice.

For the shared registration examples below, keep Zaraz's own loader and its
configured dashboard tools. Remove duplicate standalone vendor loaders only.
For this integration, c15t owns permission synchronization and Zaraz owns tool
loading.

## Register the scripts

Complete your [framework quickstart](https://c15t.com/docs/frameworks) first. Keep its Inth
endpoint, policy, styles and consent UI. Remove the vendor's original script,
SDK initializer or tag-manager entry so c15t owns loading once.

The `scripts` export in `src/consent-scripts.ts` is a configuration, not an
initializer. Add it to your existing consent owner using the registration point
below. These are partial edits to that owner, not additional providers.

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

For a Pages Router or static-export setup using `ConsentProvider`, add
`scripts` to its existing `options` instead. Keep the router-specific setup
from [Next.js script loading](../frameworks/next/script-loader.md).

**TanStack Start**

In your existing root route component, import the scripts alongside
`ConsentRoot`. Keep the server loader from the [TanStack Start quickstart](https://c15t.com/docs/frameworks/tanstack-start/quickstart).

```tsx
import { Outlet } from '@tanstack/react-router';
import { ConsentRoot } from 'c15t/tanstack-start';
import { scripts } from '../consent-scripts';

function Root() {
  const state = Route.useLoaderData();
  return (
    <ConsentRoot state={state} backendURL={backendURL} initRoute={false} scripts={scripts}>
      <Outlet />
      {/* Keep your consent banner, dialog and preferences link here. */}
    </ConsentRoot>
  );
}
```

This edits the existing route. `Route` and `backendURL` come from its setup;
keep the document shell and head components if they are part of your root.
`initRoute={false}` keeps the quickstart's direct-backend initialization.
If your app mounts a consent server route, retain its existing `initRoute`
instead. Do not return script callbacks from a server function or route loader.

**React**

Import the scripts into your existing provider component:

```ts
import { ConsentProvider } from 'c15t/react';
import { scripts } from './consent-scripts';
```

Keep the existing options and add `scripts`:

```tsx
<ConsentProvider options={{ ...consentOptions, scripts }}>
  {children}
</ConsentProvider>
```

Here `consentOptions` is your existing configuration, including
`mode: hosted({ url: backendURL })`. Keep the banner, dialog and preferences
link inside the provider. See [React script loading](https://c15t.com/docs/frameworks/react/script-loader).

**Nuxt**

Attach one loader from the root `app.vue`, after the Nuxt module has
started its browser runtime. This keeps vendor callbacks in application code rather
than serialized `nuxt.config.ts` runtime configuration.

```vue title="app/app.vue"
<script setup lang="ts">
import { onUnmounted } from 'vue';
import { createScriptLoader } from 'c15t/modules/script-loader';
import { scripts } from '../src/consent-scripts';

const nuxtApp = useNuxtApp();
const kernel = useConsentKernel();
let loader: ReturnType<typeof createScriptLoader> | undefined;

const removeMountedHook = nuxtApp.hook('app:mounted', () => {
  loader = createScriptLoader({ kernel, scripts });
});
onUnmounted(() => {
  removeMountedHook();
  loader?.dispose();
});
</script>

<template>
  <ConsentRoot />
  <NuxtPage />
</template>
```

Merge the setup code into your root and retain its footer and preferences
link. `useConsentKernel` is auto-imported by the c15t Nuxt module. Adjust the
relative script import if your `app.vue` is at the project root. This loader
waits until the module has applied browser persistence and privacy signals,
then reads the current snapshot and observes future changes. Do not also register these scripts
in another loader. See the [Nuxt quickstart](https://c15t.com/docs/frameworks/nuxt/quickstart).

**Vue**

Use the kernel already provided by the Vue plugin. Merge this setup into
`App.vue`, whose lifetime covers the application:

```vue title="src/App.vue"
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { createScriptLoader } from 'c15t/modules/script-loader';
import { useConsentKernel } from 'c15t/vue/vue-plugin';
import ConsentRoot from 'c15t/vue/consent-root';
import { scripts } from './consent-scripts';

const kernel = useConsentKernel();
let loader: ReturnType<typeof createScriptLoader> | undefined;

onMounted(() => {
  loader = createScriptLoader({ kernel, scripts });
});
onUnmounted(() => loader?.dispose());
</script>

<template>
  <ConsentRoot />
  <main>Your application</main>
</template>
```

Keep your existing page content and preferences link. The plugin still owns
the kernel and persistence; this component owns only the vendor loader.
Do not register the same scripts in plugin configuration as well. See the
[Vue quickstart](https://c15t.com/docs/frameworks/vue/quickstart).

**Astro**

Point the existing Astro integration at a client module. Keep its `mode`,
`ui` and framework integration from the [Astro quickstart](https://c15t.com/docs/frameworks/astro/quickstart).
Import `fileURLToPath` in your Astro configuration:

```js title="astro.config.mjs"
import { fileURLToPath } from 'node:url';
```

Add this option to the existing `c15t({ ... })` call. Resolve the path from
the configuration file because Astro injects the import into a virtual module:

```js
clientEntrypoint: fileURLToPath(new URL('./src/c15t.client.ts', import.meta.url)),
```

Export the scripts from that module:

```ts title="src/c15t.client.ts"
import type { C15tClientOptionsExtension } from '@c15t/astro';
import { scripts } from './consent-scripts';

export default { scripts } satisfies C15tClientOptionsExtension;
```

The integration passes this extension to its shared browser runtime. Vendor
helpers contain callbacks, so do not put them in the serialized `scripts`
option in `astro.config.mjs`. Keep one runtime across consent islands and
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
  import { ConsentManagerProvider, hosted } from '@c15t/svelte';
  import { scripts } from '../consent-scripts';

  let { children, data } = $props();
  const mode = hosted({ url: data.backendURL });
</script>

<ConsentManagerProvider {mode} {scripts} prefetch={data.prefetch}>
  {@render children()}
  <!-- Keep your consent UI and preferences link here. -->
</ConsentManagerProvider>
```

Import vendor helpers in the layout component, not in `+layout.server.ts`.
For static hosting, keep your browser-only `mode` setup and omit request
prefetch; the `scripts` prop stays the same. If you pass an externally owned
`runtime` to the provider, register scripts when creating that runtime instead.

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
[JavaScript script loading](https://c15t.com/docs/frameworks/javascript/script-loader).

## Loading and updates

The helper returns an `alwaysLoad`, `callbackOnly` configuration with category
`necessary`. This lets consent synchronization run for every visitor. It does
not make the downstream analytics or advertising tools necessary.

Zaraz normally injects its own loader. If auto-injection is disabled, install
[Zaraz manually](https://developers.cloudflare.com/zaraz/advanced/load-zaraz-manually/)
once. The bridge supports either loading order: an already-ready API is updated
immediately; otherwise it waits for `zarazConsentAPIReady` and applies the latest
c15t permissions. No polling is used.

On a change, the bridge calls `zaraz.consent.set()` before
`zaraz.consent.sendQueuedEvents()`. It flushes Zaraz's queued pageviews only when
a purpose changes from denied to allowed. Revocation updates purposes to false
and does not flush events. Repeated identical permissions do not rewrite the
Zaraz cookie. `onReady` runs once after the first successful synchronization,
including when all optional purposes are denied. A pageview sent there remains
subject to Zaraz's purpose checks.

| Option             | Default  | Behavior                                                                     |
| ------------------ | -------- | ---------------------------------------------------------------------------- |
| `purposes`         | Required | Maps categories to Zaraz purpose IDs; unmapped purposes are denied           |
| `hideBuiltInModal` | `true`   | Hides the currently visible modal; also disable auto-display in Cloudflare   |
| `sendQueuedEvents` | `true`   | Replays Zaraz's queued pageviews after new grants                            |
| `onReady`          | Unset    | Runs after initial permission synchronization                                |
| `onError`          | Unset    | Receives synchronization errors so the application can report or handle them |

If a Zaraz API call throws, `onReady` does not run until synchronization
succeeds. Use `onError(error)` to report the failure and prevent application
events from relying on permissions that were not applied. The bridge retries
with the latest permissions on the next consent update or readiness event;
it does not poll or schedule automatic retries. Without `onError`, synchronous
failures reach the script loader's debug events and readiness-event failures
reach the browser's error handler. A failed revocation can leave the previous
Zaraz grant in place.

If the bridge starts before saved consent or policy resolution is available,
it applies the kernel's current effective permissions and updates them when
initialization completes. Pass restored state during setup when available.
The bridge does not force a denial when the kernel already permits a purpose.

Set `sendQueuedEvents: false` if your application deliberately discards
pre-consent pageviews. Send subsequent route events only after readiness and
avoid combining manual route events with Zaraz's automatic SPA pageviews.

Removing or replacing the configuration, or disposing its loader, detaches the
readiness listener. Disposal does not revoke consent, clear vendor storage, or
stop a tool that has already initialized. Save the denied permissions before
teardown when revocation is required. Zaraz controls subsequent tool execution;
test vendor-specific behavior for scripts with their own ongoing activity.

## Verify the configured tools

Use a test environment with isolated destinations. Check a first visit, a return
visit with stale Zaraz grants, measurement-only acceptance, marketing-only
acceptance, rejection, and revocation. Inspect both `zaraz.consent.getAll()` and
actual tool activity. An updated consent object alone does not prove that a
misconfigured tool stopped sending data.

This integration maps c15t categories to Zaraz purposes. It does not translate
IAB TCF vendor and purpose choices or replace Zaraz's separate TCF configuration.

[Cloudflare Web Analytics](./cloudflare-web-analytics.md) is a
separate analytics product with its own loader. Zaraz manages multiple tools,
which can have different consent requirements and execution costs. Moving a
tool to Zaraz can reduce browser work, but this bridge alone does not establish
a performance improvement for that tool.
