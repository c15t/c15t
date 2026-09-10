---
title: Intercom
description: Load the Intercom messenger with functionality permission and
  configure its region.
group: integrations
---

## Register the messenger

| Package manager | Command                     |
| :-------------- | :-------------------------- |
| npm             | `npm install @c15t/scripts` |
| pnpm            | `pnpm add @c15t/scripts`    |
| yarn            | `yarn add @c15t/scripts`    |
| bun             | `bun add @c15t/scripts`     |

```ts title="src/consent-scripts.ts"
import { intercom } from '@c15t/scripts/intercom';

export const scripts = [intercom({ appId: 'your-app-id' })];
```

Pass `scripts` to the existing provider or loader. The helper uses the
`functionality` category and defaults to Intercom's US API base. Set `apiBase`
when your workspace uses another region. Optional serializable `settings` are
merged into `window.intercomSettings`.

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

## Verify identity and lifecycle

Remove an existing Intercom plugin or snippet. Test that the messenger waits
while functionality permission is denied under your policy. Check later login,
logout and user changes separately from consent initialization. Do not leave
previous-user identity in an application-controlled SDK session.

Revoking permission cannot erase a request already sent. Verify the vendor's
shutdown and future event behavior for your configuration, then run the checks
in [verification](../guides/verify-consent.md).
