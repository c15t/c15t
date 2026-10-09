---
packages:
  '@c15t/nextjs': minor
  '@c15t/react': minor
  c15t: minor
---

### Next.js reads `c15t.config.ts` on its own

`withConsentManifest()` now finds `c15t.config.ts` at the project root and
hands it to `ConsentRoot`, `resolveConsent()`, `createConsentRoute()` and the
Pages Router helpers, so the app no longer imports its config or writes a
client wrapper. Export the config as the file's default export. It is bundled
into the browser too, so it can hold `scripts` but must hold no secrets.

```ts
// c15t.config.ts
import { posthog } from '@c15t/integrations/posthog';
import { defineConsentConfig } from 'c15t/next';

export default defineConsentConfig({
	scripts: [posthog({ id: 'phc_your_project_key' })],
});
```

```tsx
// app/layout.tsx, a Server Component
import { ConsentBanner, ConsentDialog, ConsentRoot } from 'c15t/next';
import { resolveConsent } from 'c15t/next/server';

<ConsentRoot state={resolveConsent()}>
	{children}
	<ConsentBanner />
	<ConsentDialog />
</ConsentRoot>;
```

`c15t/next` has a `react-server` export: a Server Component imports
`ConsentRoot`, `ConsentBanner`, `ConsentDialog` and `ConsentDialogLink` as one
client module. This also fixes `next build --webpack`, which failed on React
hooks in the server graph. `ConsentTheme` and `defineTheme` are importable
there too, and from the new `c15t/react/theme` entry.

The config takes `mode` (`manifest()`, `hosted()` or `offline()`, exported as
data from `c15t/next`; `manifest()` by default), `routePrefix`, `journey`, and
the browser options `scripts`, `vendors`, `clearOnRevocation`,
`networkBlocker`, `persistence`, `scriptLoader` and `options`. `ConsentRoot`
props win over the config's. `ConsentRoot` warns in development when it finds
no config. `options.mode` on `ConsentRoot` takes the same data, or a transport
such as `custom(transport)`; a `hosted()` or `offline()` transport from
`c15t/react` still works but warns in development, because its code is then in
the first-load bundle.

The Pages Router gets `withConsentProps()`, a `getServerSideProps` that adds a
JSON-safe `consent` prop, and `ConsentPageProps` for `AppProps`:

```ts
// pages/index.tsx
export const getServerSideProps = withConsentProps();

// pages/api/c15t/[...c15t].ts
export default createPagesConsentRoute();
```

Breaking changes in `@c15t/nextjs` (alpha-only names, removed without an
alias):

- `defineConsentConfig({ manifestURL, initURL })`: use `routePrefix`, or
  `mode: manifest({ resolve: 'browser', manifestURL })`.
- `ConsentRoot`'s `backendURL` prop: set `backendURL` in the config or
  `NEXT_PUBLIC_C15T_BACKEND_URL`.
- `createNextConsentRouteHandlers()` and its `manifestGET`: use
  `createConsentRoute()`.
- `createPagesApiHandlers()`: use `createPagesConsentRoute()` in a catch-all
  API route.
- `resolveConsent(config)` and `createConsentRoute(config)`: pass nothing, or
  `{ config }` to override `c15t.config.ts`.
- The `manifest` option of `resolveConsent()` and `createConsentRoute()`: use
  `snapshot`.
- `ConsentManifestOptions` and the `c15t.server.ts` pattern: use
  `ResolveConsentOptions` or `NextConsentRouteOptions` when you need them.
- `resolveStrictestDefaultInit` from `c15t/next/static`: use
  `resolveUnknownLocationInit`.
- `hosted`, `offline` and `manifest` from `c15t/next` are now the data
  factories. A `ConsentProvider` that needs a transport imports them from
  `c15t/react`.
