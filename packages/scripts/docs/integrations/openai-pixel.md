---
title: OpenAI Pixel
description: Configure the OpenAI Measurement Pixel for ChatGPT Ads with c15t
  v3, manage marketing permission and verify conversion delivery.
group: integrations
---

## Configure OpenAI Pixel

Copy your Pixel ID from the conversions tab in OpenAI Ads Manager. The helper
initializes `oaiq` and loads the SDK when marketing permission allows it.

| Package manager | Command                     |
| :-------------- | :-------------------------- |
| npm             | `npm install @c15t/scripts` |
| pnpm            | `pnpm add @c15t/scripts`    |
| yarn            | `yarn add @c15t/scripts`    |
| bun             | `bun add @c15t/scripts`     |

```ts title="src/consent-scripts.ts"
import { openaiPixel } from '@c15t/scripts/openai-pixel';

export const scripts = [openaiPixel({ pixelId: 'YOUR_PIXEL_ID' })];
```

Remove the standalone OpenAI installation snippet when using this integration.
c15t creates the `oaiq` queue, initializes the pixel, and loads the SDK.

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
[JavaScript script loading](../frameworks/javascript/script-loader.md).

## Options

| Option      | Type              | Default                                     | Description                                        |
| ----------- | ----------------- | ------------------------------------------- | -------------------------------------------------- |
| `pixelId`   | `string`          | Required                                    | Your OpenAI Ads Manager Pixel ID.                  |
| `debug`     | `boolean`         | `false`                                     | Log SDK activity to the browser console.           |
| `user`      | `OpenAIPixelUser` | Omitted                                     | User matching fields passed to SDK initialization. |
| `scriptSrc` | `string`          | `https://bzrcdn.openai.com/sdk/oaiq.min.js` | Override the SDK URL.                              |

## Consent behavior

The first SDK request waits for effective `marketing` permission. Under an
opt-in policy, that means waiting for the visitor to grant consent.
`measurement` permission alone does not enable this advertising pixel.

Before the SDK loads, c15t queues these commands in order:

```js
oaiq('consent', false);
oaiq('init', { pixelId: 'YOUR_PIXEL_ID', debug: false });
oaiq('consent', true);
```

The initial denial overrides the SDK's default consent of `true`. Once loaded,
the SDK stays on the page. c15t calls `oaiq('consent', false)` when marketing
permission is denied and `oaiq('consent', true)` when it is granted again.
Granting permission again does not reload or reinitialize the pixel.

OpenAI documents that denied measurement events are dropped and are not replayed
when consent returns. Consent denial does not unload the SDK or promise to erase
existing attribution cookies. The SDK can still send diagnostic pings while
measurement consent is denied.

## User matching

Add `user` to the existing `openaiPixel` configuration in
`src/consent-scripts.ts` to include customer matching data at initialization.
All fields are optional:

* `email_sha256`, `phone_number_sha256`, `external_id_sha256`,
  `first_name_sha256`, and `last_name_sha256` accept normalized SHA-256 hashes.
* `country`, `city`, `region`, and `postal_code` accept location strings.

```ts
openaiPixel({
  pixelId: 'YOUR_PIXEL_ID',
  user: { country: 'US', region: 'California', postal_code: '94107' },
});
```

Normalize identifiers according to OpenAI's
[user data rules](https://developers.openai.com/ads/measurement-pixel#send-user-data),
then hash them as lowercase, 64-character SHA-256 hex strings. c15t forwards these
values unchanged. It does not collect customer location or identifiers, or
normalize or hash identifiers for you.

If user data becomes available after initialization, pass the complete updated
object through `window.oaiq?.('init', { pixelId: 'YOUR_PIXEL_ID', user })`.
User data belongs on `init`, not on individual conversion events. Automatic
advanced matching is configured by OpenAI; it is not an additional SDK init option.

## Send conversions

Installing the pixel does not send a conversion or page view. Check effective
marketing permission using your framework
[consent API](https://c15t.com/docs/frameworks) before calling `openaiPixelEvent` from an
application event handler. The helper checks API availability, not permission;
the loaded SDK applies the consent signal supplied by c15t.

This partial example belongs in an order-completion handler after that
permission check. It sends an order value of $25.99:

```ts
import { openaiPixelEvent } from '@c15t/scripts/openai-pixel';

openaiPixelEvent(
  'order_created',
  { type: 'contents', amount: 2599, currency: 'USD' },
  { event_id: 'order_123', opt_out: true },
);
```

The helper supports every documented browser event and its corresponding data
shape. The optional fourth argument to the SDK, passed as the helper's third
argument, supports `event_id` for browser/server deduplication and `opt_out` for
opting an event out of future user-level personalization.

Calls made before the queue exists are dropped. A callable `window.oaiq` does
not mean marketing permission is still granted. Stop application event calls
when permission is denied, even though the SDK remains loaded.

`window.oaiq` is also typed for `init`, `consent`, `measure`, and `measureSingle`.
The event helper uses `measure`, which sends to every initialized pixel. To target
one initialized pixel, use:

```ts
window.oaiq?.(
  'measureSingle',
  'YOUR_PIXEL_ID',
  'page_viewed',
  { type: 'contents' },
);
```

See OpenAI's [supported events](https://developers.openai.com/ads/supported-events)
for payload fields. `app_installed` and `app_opened` require the Conversions API
and are not supported by the browser pixel.

### Custom events

Custom events require `custom_event_name`. After checking marketing permission,
you can verify a custom event with a clearly named payload:

```ts
import { openaiPixelEvent } from '@c15t/scripts/openai-pixel';

openaiPixelEvent(
  'custom',
  { type: 'custom' },
  {
    custom_event_name: 'c15t_integration_test',
    event_id: crypto.randomUUID(),
    opt_out: true,
  },
);
```

## Verify the integration

Use a fresh session with an opt-in policy and set `debug: true` in your existing
`openaiPixel` configuration while testing.

1. Before granting `marketing`, verify that the OpenAI SDK does not load and no
   measurement request is sent. Granting only `measurement` should not load it.
2. Grant `marketing` and perform an action that calls your event handler. For a
   page view, send `page_viewed` with `{ type: 'contents' }`.
3. Open Event Stream in Ads Manager and find the event. Inspect requests to
   `https://bzr.openai.com/v1/sdk/events` in the Network panel and check the
   response status. An accepted request confirms transport, not attribution to
   a ChatGPT ad.
4. Revoke `marketing` and verify that future application event calls stop. The
   SDK remains loaded and may still send diagnostic pings. Grant permission
   again and check that the SDK is not loaded twice.
5. Reload and repeat with the saved choice. Turn off `debug` after testing.

The browser console reports whether the SDK queued or dropped an event. Follow
the [consent verification guide](../guides/verify-consent.md) for policy and
privacy-signal checks.

The c15t live vendor monitor checks consent gating, the queue, the real SDK
response, and runtime initialization. It uses a placeholder Pixel ID and blocks
measurement requests, so monitor runs do not populate your Ads Manager events.

## Content Security Policy

If your site uses a Content Security Policy, allow these sources in the
corresponding directives:

| Directive     | Sources                                                  |
| ------------- | -------------------------------------------------------- |
| `script-src`  | `https://bzrcdn.openai.com`                              |
| `connect-src` | `https://bzr.openai.com` and `https://bzrcdn.openai.com` |
| `img-src`     | `https://bzr.openai.com`                                 |

Also allow the CDN in `script-src-elem` if your policy defines that directive.
