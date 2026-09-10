---
title: Meta Pixel
description: Register the Meta Pixel under marketing permission and verify event
  calls after revocation.
group: integrations
---

## Register the pixel

| Package manager | Command                     |
| :-------------- | :-------------------------- |
| npm             | `npm install @c15t/scripts` |
| pnpm            | `pnpm add @c15t/scripts`    |
| yarn            | `yarn add @c15t/scripts`    |
| bun             | `bun add @c15t/scripts`     |

```ts title="src/consent-scripts.ts"
import { metaPixel } from '@c15t/scripts/meta-pixel';

export const scripts = [metaPixel({ pixelId: '123456789012345' })];
```

Replace the pixel ID and pass `scripts` to your existing provider or core script
loader. The helper uses the `marketing` category. Remove the original pixel
snippet, including a separately installed tracking image or tag-manager entry.

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

## Keep event calls behind permission

Initialization and later application events are separate responsibilities. If
application code calls `fbq` directly, check effective marketing permission
before each optional event and ensure the API is available. Do not assume a
function still present on `window` means the visitor still permits tracking.

For an opt-in policy, verify no pixel script or collection request occurs before
permission or after rejection. Grant permission, send a test event, revoke and
confirm future application events stop. Check navigation for duplicate page
views. See [verification](../guides/verify-consent.md).
