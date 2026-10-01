---
title: Intercom
description: Load the Intercom messenger only after functionality consent with
  the c15t intercom helper, set its region and check it in DevTools.
group: integrations
---

## Configure Intercom

Copy the app ID from your Intercom installation snippet, where it is set as
`app_id`. If your workspace is hosted in the EU or Australia, also set
`apiBase`.

| Package manager | Command                                |
| :-------------- | :------------------------------------- |
| npm             | `npm install @c15t/integrations@alpha` |
| pnpm            | `pnpm add @c15t/integrations@alpha`    |
| yarn            | `yarn add @c15t/integrations@alpha`    |
| bun             | `bun add @c15t/integrations@alpha`     |

```ts title="src/consent-scripts.ts"
import { intercom } from '@c15t/integrations/intercom';

export const scripts = [intercom({ appId: 'YOUR_APP_ID' })];
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

const consent = init({ backendURL, scripts });
```

`backendURL` is the Inth URL from your quickstart. With
`createConsentRuntime` from `c15t/runtime`, pass `scripts` to it instead.
A kernel you create yourself needs a loader from
`c15t/modules/script-loader`. Attach one loader per kernel. See
[JavaScript scripts](../frameworks/javascript/scripts.md).

**React Native**

There is no script loader to register. `@c15t/integrations` loads browser
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

| Option      | Default                                     | Behavior                                                                                                                                |
| ----------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `appId`     | Required                                    | Sets `app_id` and the loader URL. The helper trims it. Empty or whitespace-only values throw.                                           |
| `apiBase`   | `https://api-iam.intercom.io`               | Regional API base. `INTERCOM_API_BASES` from `@c15t/integrations/intercom` lists `us`, `eu` and `au`.                                   |
| `settings`  | None                                        | Extra JSON-serializable settings merged into `window.intercomSettings`. `appId` and `apiBase` override any `app_id` or `api_base` here. |
| `scriptSrc` | `https://widget.intercom.io/widget/<appId>` | Loader URL override. A blank value falls back to the default.                                                                           |

## Loading and revocation

`intercom` uses the `functionality` category. Once functionality is allowed,
the helper defines a queueing `window.Intercom` stub, writes
`window.intercomSettings` and loads the messenger. On revocation it removes the
script element and calls no Intercom API, including `shutdown`. The messenger
keeps running until c15t reloads the page.

## Guard your own Intercom calls

The helper writes `settings` once, before the messenger loads. It does not
update them when a user logs in or out, so send identity changes through
Intercom's messenger API yourself. After revocation `window.Intercom` still
exists, so its presence does not mean functionality is allowed. Check the
permission first:

```ts title="src/intercom-user.ts"
export function updateIntercomUser(
  functionalityAllowed: boolean,
  userId: string
) {
  if (!functionalityAllowed || typeof window.Intercom !== 'function') return;
  window.Intercom('update', { user_id: userId });
}
```

Pass the current functionality permission from your framework, for example
`useConsent('functionality')` in React.

## Verify Intercom

After you allow functionality, the request to
`widget.intercom.io/widget/<appId>` appears and the messenger shows. Log in
and out of your app, and check that the messenger never shows the previous
user's conversations.

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
[clear on revocation](./clear-on-revocation.md).

The helper sets `vendor` to its script ID, so once you declare that vendor a
visitor can turn it off inside an allowed category. See
[let visitors turn off one vendor](./granular-consent.md). The
[consent verification guide](../guides/verify-consent.md) covers navigation,
expiry and hosting checks.
