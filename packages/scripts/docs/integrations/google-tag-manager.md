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

**Next.js**

Import the configuration into the client boundary from your router guide:

```ts
import { ConsentBoundary } from 'c15t/next';
import { scripts } from './consent-scripts';
```

Keep the server-prefetched configuration and shared `consentConfig` from
your router guide. Its manifest, init and save URLs stay in effect. Add
`scripts` as a top-level prop on the existing boundary:

```tsx
<ConsentBoundary config={config} consent={consentConfig} scripts={scripts}>
  {children}
</ConsentBoundary>
```

For a Pages Router or static-export setup using `ConsentProvider`, add
`scripts` to its existing `options` instead. Keep the router-specific setup
from [Next.js script loading](../frameworks/next/script-loader.md).

**TanStack Start**

In your existing root route component, import the scripts alongside the
boundary. Keep the server loader from the [TanStack Start quickstart](https://c15t.com/docs/frameworks/tanstack-start/quickstart).

```tsx
import { Outlet } from '@tanstack/react-router';
import { ConsentBoundary } from 'c15t/tanstack-start';
import { scripts } from '../consent-scripts';

function Root() {
  const config = Route.useLoaderData();
  return (
    <ConsentBoundary config={config} backendURL={backendURL} initRoute={false} scripts={scripts}>
      <Outlet />
      {/* Keep your consent banner, dialog and preferences link here. */}
    </ConsentBoundary>
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
link inside the provider. See [React script loading](../frameworks/react/script-loader.md).

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
Add this option to the existing `c15t({ ... })` call:

```ts
clientEntrypoint: './src/c15t.client.ts'
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
[JavaScript script loading](../frameworks/javascript/script-loader.md).

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
