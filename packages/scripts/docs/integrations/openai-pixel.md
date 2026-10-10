---
title: OpenAI Pixel
description: Load the ChatGPT Ads Measurement Pixel only after marketing consent
  with the c15t openaiPixel helper, guard oaiq conversion calls, and check it in
  DevTools.
icon: chatgpt
group: integrations
---

## Configure the OpenAI Pixel

Copy the pixel ID from the conversions tab in OpenAI Ads Manager. Remove the
standalone OpenAI installation snippet, because the helper creates the `oaiq`
queue and initializes the pixel itself.

| Package manager | Command                                |
| :-------------- | :------------------------------------- |
| npm             | `npm install @c15t/integrations@alpha` |
| pnpm            | `pnpm add @c15t/integrations@alpha`    |
| yarn            | `yarn add @c15t/integrations@alpha`    |
| bun             | `bun add @c15t/integrations@alpha`     |

```ts title="src/consent-scripts.ts"
import { openaiPixel } from '@c15t/integrations/openai-pixel';

export const scripts = [openaiPixel({ pixelId: 'YOUR_PIXEL_ID' })];
```

## Register the scripts

Complete your [framework quickstart](https://v3.c15t.com/docs/frameworks) first. Keep its Inth
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
`initRoute` from the [TanStack Start quickstart](https://v3.c15t.com/docs/frameworks/tanstack-start/quickstart):

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

`mode` is the `hosted({ url: 'https://your-project.inth.app' })` value
from the [React quickstart](https://v3.c15t.com/docs/frameworks/react/quickstart). Keep the banner,
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
import { scripts } from './consent-scripts';

app.use(c15tVue, {
  backendURL: 'https://your-project.inth.app',
  scripts,
});
```

Keep your existing backend URL and other options. The plugin starts one
script loader when the app mounts, after it has applied the visitor's stored
choice. Do not also call `createScriptLoader` from a component. See
[Vue scripts and embeds](../frameworks/vue/scripts.md).

**Astro**

Add the scripts to the client entrypoint from the
[Astro quickstart](https://v3.c15t.com/docs/frameworks/astro/quickstart), the module that the
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

  const mode = hosted({ url: 'https://your-project.inth.app' });
</script>

<ConsentManagerProvider {mode} {scripts}>
  <!-- Keep your application, consent UI and preferences link here. -->
</ConsentManagerProvider>
```

Retain the styles and consent UI from the [Svelte quickstart](https://v3.c15t.com/docs/frameworks/svelte/quickstart).
The provider owns the loader and disposes it on unmount.

**SvelteKit**

Add the scripts to the existing root layout provider. Keep the server load
and its serializable prefetch data from the [SvelteKit quickstart](https://v3.c15t.com/docs/frameworks/sveltekit/quickstart).

```svelte title="src/routes/+layout.svelte"
<script lang="ts">
  import { ConsentManagerProvider, hosted } from '@c15t/svelte';
  import { scripts } from '../consent-scripts';

  let { children, data } = $props();
  const mode = hosted({ url: 'https://your-project.inth.app' });
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

Pass the scripts to `init()` from `@c15t/browser`, next to your backend
URL:

```ts
import { init } from '@c15t/browser';
import { scripts } from './consent-scripts';

const consent = init({
  backendURL: 'https://your-project.inth.app',
  scripts,
});
```

Keep the backend URL from your quickstart. With
`createConsentRuntime` from `c15t/runtime`, pass `scripts` to it instead.
A kernel you create yourself needs a loader from
`c15t/modules/script-loader`. Attach one loader per kernel. See
[JavaScript scripts](../frameworks/javascript/scripts.md).

## Options

| Option      | Default                                     | Behavior                                                                                                                                                                                    |
| ----------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pixelId`   | Required                                    | Pixel ID passed to `oaiq('init', ...)`. The helper trims it. Empty or whitespace-only values log an error and the script does not load.                                                     |
| `debug`     | `false`                                     | Logs SDK activity, including queued and dropped events, to the browser console.                                                                                                             |
| `user`      | None                                        | User matching fields passed to `init`: `email_sha256`, `phone_number_sha256`, `external_id_sha256`, `first_name_sha256`, `last_name_sha256`, `country`, `city`, `region` and `postal_code`. |
| `scriptSrc` | `https://bzrcdn.openai.com/sdk/oaiq.min.js` | SDK URL override. A blank value falls back to the default.                                                                                                                                  |

c15t forwards `user` unchanged. Normalize and hash identifiers yourself as
OpenAI's
[user data rules](https://developers.openai.com/ads/measurement-pixel#send-user-data)
describe. If user data arrives after initialization, call
`window.oaiq('init', { pixelId, user })` again with the complete object.

## Loading and revocation

`openaiPixel` uses the `marketing` category. Before marketing is allowed, c15t
defines no `oaiq` function and loads nothing from OpenAI. Measurement
permission alone does not load the pixel. When marketing becomes allowed, the
helper queues `oaiq('consent', false)`, `init` and `oaiq('consent', true)`,
then loads `oaiq.min.js`. The first call overrides the SDK's default consent of
`true`.

On revocation the helper keeps the SDK and calls `oaiq('consent', false)`. If
the visitor allows marketing again before the page reloads, it calls
`oaiq('consent', true)` without reinitializing the pixel. OpenAI drops events
sent while consent is denied and does not replay them later. The SDK can still
send diagnostic pings while consent is denied.

## Guard your own oaiq calls

The helper sends no page view or conversion, so every event comes from your
code. After revocation `window.oaiq` still exists, so its presence does not
mean marketing is allowed. Check the permission first, then that the queue
exists:

```ts title="src/track-order.ts"
export function trackOrder(marketingAllowed: boolean, orderId: string) {
	if (!marketingAllowed || typeof window.oaiq !== 'function') return;
	window.oaiq(
		'measure',
		'order_created',
		{ type: 'contents', amount: 2599, currency: 'USD' },
		{ event_id: orderId }
	);
}
```

Pass the current marketing permission from your framework, for example
`useConsent('marketing')` in React. `amount` is an integer in the currency's
minor unit, so `2599` is $25.99. Reuse `event_id` on the server event to
deduplicate it.

`@c15t/integrations/openai-pixel` also exports `openaiPixelEvent`, a typed wrapper
around `oaiq('measure', ...)`. It drops calls made before the queue exists and
does not check permission, so apply the same guard before calling it. A
`custom` event needs `custom_event_name` in its options. To send to one pixel
when you run several, call `window.oaiq('measureSingle', pixelId, ...)`.

## Verify the OpenAI Pixel

Set `debug: true` while you test. After you allow marketing, `oaiq.min.js`
loads from `bzrcdn.openai.com`. Trigger one guarded event and check that a
request to `https://bzr.openai.com/v1/sdk/events` succeeds and the event
appears in Event Stream in Ads Manager. An accepted request confirms delivery,
not attribution to a ChatGPT ad. Then revoke marketing. Until the page
reloads, calling `trackOrder` sends nothing. Turn off `debug` when you finish.

If your site sets a Content Security Policy, allow `https://bzrcdn.openai.com`
in `script-src`, both `https://bzr.openai.com` and `https://bzrcdn.openai.com`
in `connect-src`, and `https://bzr.openai.com` in `img-src`.

Test in a private window with an opt-in policy. Open DevTools Network, disable
the cache and filter by the vendor's domain:

1. Load the page. No request goes to the vendor before you choose.
2. Click Reject, then reload. There is still no vendor request.
3. Open Privacy settings and allow the helper's category. The vendor script
   loads without a page reload.
4. Turn the category off again and save. c15t reloads the page, and the new
   page makes no vendor request.

c15t reloads on revocation because removing a script element does not stop
code that already ran. The vendor's listeners, timers and queued events stay
alive until the page unloads. If you set `reloadOnConsentRevoked: false`, stop
the vendor yourself. Register a callback-only script whose `onConsentChange`
calls the vendor's opt-out API, as shown in
[custom integrations](./building-integrations.md), and check the
permission before each of your own event calls. The reload does not delete
cookies the vendor already set; see
[clear on revocation for your framework](./overview.md#vendor-switches-and-cookie-cleanup).

The helper sets `vendor` to its script ID, so once you declare that vendor a
visitor can turn it off inside an allowed category. See
[vendor consent for your framework](./overview.md#vendor-switches-and-cookie-cleanup). The
[consent verification guide](../guides/verify-consent.md) covers navigation,
expiry and hosting checks.
