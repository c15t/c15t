## c15t@3.0.0-alpha.10 (alpha)

### TanStack Start: the consent state carries its config

`createConsentStateHandler()` now needs no options. It reads the backend URL
and the policy snapshot from `consentManifest()` in `vite.config.ts`, and the
state it returns carries `backendURL`, `mode` and `routePrefix` to
`ConsentRoot`, which only needs `state`:

```tsx
const getConsentState = createServerFn({ method: 'GET' }).handler(
	createConsentStateHandler()
);

<ConsentRoot state={consent} scripts={scripts}>
```

`createConsentStateHandler({ mode, routePrefix, proxy, snapshot })` takes the
mode as data. `manifest()`, `hosted()` and `offline()` from
`c15t/tanstack-start` are now the data factories from `c15t/modes`, not
transports. `manifest()` (the default) resolves the visitor on the server.
`manifest({ resolve: 'browser' })` leaves it to the browser, and `hosted()`
and `offline()` resolve as their names say. A mode's `snapshot` stays on the
server.

`ConsentRoot` no longer imports the hosted transport. Its first-load
JavaScript holds the record transport only, and the code for init loads
when the browser runs init. The TanStack Start quickstart's first load is
about 500 B (gzip) smaller.

`consentManifest()` from `c15t/tanstack-start/build` serves the snapshot as
`c15t/generated` instead of writing `c15t-manifest.ts`. The browser bundle
gets `snapshot: undefined`. It reads `VITE_C15T_BACKEND_URL`, then
`VITE_INTH_PROJECT_URL`, and a failed download stops `vite build` and warns
in `vite dev`; `onBuildError` and `C15T_ON_BUILD_ERROR` change that.

The browser gets init from `${backendURL}/init` unless the state names a
`routePrefix`, the same option, meaning and default (none) as Next.js. Before,
`ConsentRoot` sent init to `/api/c15t/init` by default, so an app that didn't
mount the consent route got a 404 on every page load.

The consent route is `createConsentRoute()` and needs no options either:

```ts
// src/routes/api/c15t/$.ts
export const Route = createFileRoute('/api/c15t/$')({
	server: { handlers: createConsentRoute() },
});
```

With `createConsentRoute({ proxy: true })`, pass
`createConsentStateHandler({ routePrefix: '/api/c15t', proxy: true })` so the
browser saves through the route.

Removed, with no deprecated alias (these were v3 alpha only):

- `ConsentRoot`'s `backendURL` and `routePrefix` props: pass them to
  `createConsentStateHandler()`. A page with no loader passes `state={{}}`
  and gets the backend URL from `consentManifest()`.
- `ConsentRoot`'s `initRoute` prop and the `DEFAULT_INIT_ROUTE` export.
  Replace `initRoute="/api/c15t/init"` with
  `createConsentStateHandler({ routePrefix: '/api/c15t' })`, and drop
  `initRoute={false}`, which is now the default. The server helpers'
  `routePrefix` has no `/api/c15t` default either.
- `createConsentServerRoute`: use `createConsentRoute`, which returns only
  `GET` (plus the write methods with `proxy`). `manifestGET`, `initGET` and
  `proxyHandler` are removed.
- The `manifest` option of `createConsentStateHandler`, `resolveConsent` and
  `createConsentRoute`: use `snapshot`. `manifestURL` on the state handler
  moves to `manifest({ manifestURL })`.
- `ConsentManifestOptions` and `resolveStrictestDefaultInit`: use
  `ResolveConsentOptions` and `resolveUnknownLocationInit`.
- `consentManifest()`'s `outputFile`, `exportName`, `importSource` and
  `rootDir` options, and the generated `c15t-manifest.ts`.

The server render now fetches a relative `backendURL`, such as a backend
mounted elsewhere on the same origin. It skips only URLs under `routePrefix`,
or `/api/c15t` when none is set, so a render never calls its own consent
route.

Changed: a root whose state names no backend URL, and no `consentManifest()`,
throws instead of falling back to offline mode. Pass `mode: offline()` to
resolve without a backend.

### Consent modes as data, `c15t/generated` and one build-failure policy

Breaking for earlier v3 alphas. Every name below was alpha-only, so it is
removed with no deprecated alias.

**Modes as data.** `c15t/modes` (`@c15t/core/modes`) exports `manifest()`,
`hosted()` and `offline()` as plain data factories. Each returns a
serializable `{ type, …options }` object, typed as `ConsentMode`, with no
imports behind it. Server-rendered frameworks take this data in their config.

```ts
import { hosted, manifest, offline } from 'c15t/modes';

manifest(); // { type: 'manifest' }
manifest({ resolve: 'browser', geoURL: '/api/geo' });
hosted({ backendURL: 'https://your-project.inth.app' });
offline({ policyRules });
```

`manifest()` takes `source` (`'build'`, the default, or `'runtime'`) or
`snapshot`, never both, plus `resolve`, `manifestURL`, `geoURL` and `inputs`.

`hosted()`, `offline()` and `manifest()` as transports carry their options as
enumerable data too, so they satisfy `ConsentMode`. Transport factories can
report `kind: 'manifest'`.

**First-load JavaScript.** `c15t/runtime/client-mode` turns mode data into a
transport for a server-rendered page. For `manifest()` resolved on the server
and for `hosted()`, first-load JavaScript holds only the record transport and
the init-request builder. The hosted init path, browser resolution and
offline mode load with `import()` when they run, from self-contained chunks,
so Vite and Turbopack don't split a page's first-load chunk around them.
`clientMode()` takes `initialData`, an init response a prefetch script already
requested.

**One browser manifest resolver.** `c15t/transports/manifest-browser`
resolves a manifest in the browser. It bundles English base copy and loads
other languages with `import('@c15t/translations/<lang>')` the first time a
visitor needs one. When the policy depends on a location the page doesn't
know, it asks `geoURL`, then the backend's `/init`. `@c15t/browser`, React,
Svelte, Vue and the Next.js root use it instead of the all-languages
resolver, so they no longer download every language.
`c15t/transports/manifest` bundles every language and is for server code
only.

**`c15t/generated`.** The build integrations no longer write
`c15t-manifest.ts` into your source tree, so there is nothing to add to
`.gitignore` and type checks pass on a fresh clone. `c15t/generated`
(`@c15t/core/generated`) exports `snapshot`, the fetched manifest, and
`backendURL`, the URL the build read it from. Both are `undefined` when the
build has no snapshot. In the browser bundle of TanStack Start and SvelteKit,
`snapshot` is always `undefined`; single-page apps get it in the browser.
Most apps never import it: the framework helpers read it themselves.

**One rule for failed build-time manifest fetches.** Every build integration
handles a failed fetch the same way: `withConsentManifest` in Next.js, the
`consentManifest` Vite plugins (`c15t/build`, `c15t/tanstack-start/build`,
`c15t/vue/vite`, `@c15t/svelte/vite`), the Nuxt module and the Astro
integration.

- The fetch waits at most 10 seconds.
- A production build (`next build`, `vite build`, `nuxt build`,
  `astro build`) stops with an error that names the URL and the cause.
- Dev (`next dev`, `vite dev`, `nuxt dev`, `astro dev`) logs a warning and
  fetches the policy at runtime. `snapshot` is then `undefined`.
- A missing backend URL follows the same rule.
- The new `onBuildError` option picks one behaviour for both commands:
  `'fail'` stops dev too, and `'runtime'` lets a production build continue
  and fetch at runtime. The `C15T_ON_BUILD_ERROR` environment variable
  overrides it, so you can deploy during a backend outage without a code
  change: `C15T_ON_BUILD_ERROR=runtime npm run build`.
- The fetch is skipped, without an error, for a relative backend URL. With
  `onBuildError: 'fail'`, a relative URL stops the build.
- The Vite plugins fetch only for a bundle that reads `snapshot`. A
  single-page app picks its mode in app code, so `vite build` fills the
  snapshot in after tree-shaking: a React, Vue, Svelte or JavaScript app
  that uses `hosted()` or `offline()` never contacts the backend during the
  build, and a backend outage no longer stops it. `vite dev` fetches when
  the app first loads `c15t/generated`.
- The plugins can't see the options passed to `manifest()`, so an app whose
  `manifest()` takes `manifestURL` or `source: 'runtime'` still reads
  `snapshot`. Pass `source: 'runtime'` to the plugin as well, as in
  `consentManifest({ source: 'runtime' })`: it never fetches, and serves
  `snapshot: undefined` in dev and in builds.

The build reads the backend URL from the framework's public variable when you
don't pass one, from the environment or a `.env` file:
`NEXT_PUBLIC_C15T_BACKEND_URL`, `NUXT_PUBLIC_C15T_BACKEND_URL`,
`PUBLIC_C15T_BACKEND_URL` (Astro, Svelte and SvelteKit) or
`VITE_C15T_BACKEND_URL` (TanStack Start, React, Vue and plain JavaScript).
The Vite plugins set an unset `VITE_C15T_BACKEND_URL` to the URL they used.
Each variable has an Inth alternative, read when the c15t one is unset, such
as `VITE_INTH_PROJECT_URL`, so other Inth SDKs can share the project URL.

`consentManifest()` from `c15t/build` warns when the downloaded policy
depends on the visitor's location. A single-page app's `manifest()` then still
asks the backend's `/init` on the first visit unless the page passes `inputs`
or `geoURL`, so the warning suggests `hosted()`.

`offline()` now reports the location it resolved for, so the Vue and Astro
preference dialog shows its title.

**Consent write code loads later.** Once a banner or dialog has shown, the
code that saves consent loads on the first press, key or focus inside it, or
in idle time three seconds after the load event, whichever comes first. It
used to load in the first idle time after the load event, which could land it
in first-load JavaScript. A save that comes first still waits for it.

Removed:

- `hosted({ url })`: use `hosted({ backendURL })`.
- `createManifestTransport({ manifest })`: use
  `createManifestTransport({ snapshot })`.
- `hostedModes` from `c15t/runtime/provider`: use `readHostedMode(mode)`.
- The generated `c15t-manifest.ts` file, and the build options `outputFile`,
  `exportName`, `importSource` and `rootDir`. Delete the file and its
  `.gitignore` entry, and replace
  `import { consentManifest } from './c15t-manifest'` with
  `import { snapshot } from 'c15t/generated'`.

Changed:

- `hosted()` asserts the resolved decision on saves whenever `initURL` is
  set. Pass `assertDecisionInputs: false` to turn that off.
- The error for a runtime with no `mode` names the package and the API that
  got none, such as ``@c15t/react ConsentProvider: `mode` is required. Use
  manifest() or hosted().``, instead of the v2
  `ConsentManagerProvider`. Production builds name the package only.

### Throw when an IAB policy has no `IABProvider`

When a visitor's policy used the `iab` model and the backend sent its vendor
list, an app without `IABProvider` showed no consent UI at all: the standard
`ConsentBanner` and `ConsentDialog` do not handle the IAB model. They now
throw an `IABUnavailableError` (code `C15T_IAB_UNAVAILABLE`) during render,
on the server and in the browser:

> c15t: this visitor's policy uses IAB TCF, but no <IABProvider> is mounted.

Render `IABProvider` from `c15t/react/iab` for those visitors, or remove the
`iab` model from the policy. A backend that answers `gvl: null` turns IAB off
for the request, and nothing throws.

`@c15t/core` exports `IABUnavailableError`, `IAB_UNAVAILABLE_ERROR_CODE` and
`policyNeedsIAB()`, which adapters use to decide when to throw.

### Make IAB TCF opt-in for Vue and Nuxt

The Vue plugin and Nuxt module no longer turn on IAB TCF from the policy
alone. Without an `iab` option, `@c15t/iab` and the IAB banner and dialog
never load, no `__tcfapi` is installed, and Nuxt pages stop prefetching them.
On a Nuxt site with no IAB policy, that removes about 13 KB of gzipped
prefetch from every page.

A visitor whose policy uses the `iab` model, on an app without `iab`, now
gets an `IABUnavailableError` (code `C15T_IAB_UNAVAILABLE`) when the backend
sends the vendor list:

> c15t: this visitor's policy uses IAB TCF, but `iab` is not set.

In Nuxt, a server render fails and Nuxt shows its error page; a prerendered
or `ssr: false` page shows the same error page once the browser resolves the
policy. With the Vue plugin, `app.use()` throws when the policy arrives with
`prefetch`, and otherwise the error is thrown as an uncaught error after
`/init` answers. A backend that answers `gvl: null` turns IAB off for the
request, and nothing throws.

If you relied on your policy to show the IAB banner, add `iab: {}`, or
`iab: { cmpId }` when the backend does not send one. In Nuxt, put it under
`c15t` in `nuxt.config.ts`. Set only in `app.config.ts`, IAB still works but
pages do not prefetch the IAB banner and CMP. `iab: false` and
`iab: { enabled: false }` count as unset, so an IAB policy throws there too.

### Stop c15t's stylesheet holding back the first paint

The stylesheet apps imported for c15t was linked from `<head>`, and the
browser painted nothing until it downloaded. On a throttled phone, a Next.js
page with a banner first painted at about 650 ms instead of 370 ms. Now the
stock surfaces bring their own styles, and no c15t stylesheet request comes
before the first paint.

- **React, Next.js and TanStack Start.** `ConsentBanner`,
  `ConsentDialogTrigger`, `ConsentGate`, `ConsentDialog` and `ConsentWidget`
  render the c15t rules they use as `<style>` elements. A server-rendered
  banner puts them in the HTML. The dialog's rules ship with the dialog's
  code. React 19 moves them into `<head>` and renders each once; with the
  provider's `nonce`, or in React 18, they render next to the surface and
  carry the nonce.
  `IABConsentBanner` and `IABConsentDialog` deliver their IAB rules the same
  way, including the shared styles a standalone dialog needs.
  Streamed React IAB banners wait for their complete markup before becoming
  visible, so the centered card does not shift while its content arrives.
- **Svelte and SvelteKit.** The surfaces add their rules to `<head>` in the
  browser. On a server-rendered SvelteKit page, `c15tHandle` writes the
  banner's rules into the HTML.
  IAB banners and dialogs also deliver their own styles.
- **Astro.** The integration no longer adds `c15t/astro/styles.css` to every
  page. `<ConsentScript />`, or the banner on a layout without it, inlines the
  first-paint rules, including IAB when configured, and Astro's CSP config gets their hash. The dialog's
  rules load when a dialog first opens. A site on Tailwind CSS 3 keeps the
  linked stylesheet, which its PostCSS build has to process.

Remove the `styles.css` import from your app. If you keep it, the page looks
the same, but the stylesheet still holds the first paint and its rules load
twice. To keep importing it, for Tailwind CSS 3 or a named cascade layer, set the new
`styles: false` option on the provider (`ConsentRoot`'s `options` in Next.js
and TanStack Start). A nonce-based `style-src` needs the provider's `nonce`,
or `styles: false`.

`@c15t/ui` adds `@c15t/ui/styles/sheets/first-paint`, `dialog` and
`primitives`, plus `iab-first-paint` and `iab-dialog`, which export those rules
as strings. `dialog.css` and `iab-dialog.css` are available in the same
directory for deferred loading. The aggregate stylesheets remain available.

The setup CLI omits aggregate CSS imports for adapters that deliver their own
styles. Tailwind CSS 3 setups keep manual imports and disable automatic styles.

### Keep banner taps made before the page hydrates

A banner rendered on the server shows before the page's JavaScript runs. On a
slow phone that gap lasts seconds: about 2 s on Next.js and 1.2 s on Nuxt in
our mobile benchmark. A tap on Accept all or Reject all in that gap did
nothing. The button had no handler yet, the banner stayed up and no choice
was saved.

The stock banner in React, Next.js, TanStack Start, Vue and Nuxt now renders
a small inline script in front of its buttons. It holds an Accept all, Reject
all, notice dismiss or Customize tap and hides the banner straight away for
the first three. Once the banner hydrates and the runtime has started, c15t
records the choice or the notice dismissal with the time of the tap, so
later init data can't overwrite it, then saves it and loads the scripts it allows. Customize opens
the dialog. A tap is dropped and the banner shows again when the browser
resolves a different consent model or prompt than the one the visitor saw.

Under a Content Security Policy the script takes the `nonce` you already pass
to c15t. The IAB banner and banners built from hooks are unchanged. In a
banner composed from `ConsentBanner.*` parts, a button with its own `onClick`,
`asChild`, `type="submit"` or `performDefaultAction={false}` keeps the old
behavior, so a handler that calls `preventDefault()`, a link or a form still
decides what its tap does. A held tap is recorded with the banner's
`uiSource`.

`kernel.commands.dismissNotice()` takes an optional `{ actionAt }`, the time
the visitor dismissed the notice. A future or invalid time falls back to now.

### Stop c15t stylesheets blocking the first paint in Nuxt

Nuxt inlined the banner's styles into the HTML and also linked the same CSS
as render-blocking stylesheets, together with the dialog trigger's CSS,
which no first paint uses. On a throttled phone, a page with a banner first
painted at about 1,070 ms instead of 450 ms.

`ConsentRoot` now loads the banner and the trigger as their own chunks.
Every page preloads the banner chunk, and the CSS Nuxt inlines is preloaded
instead of linked. The browser applies that CSS with the chunk, before it
shows a banner it renders itself. The trigger chunk loads after the page
mounts, and only with `showTrigger`. With `features.inlineStyles: false`,
Nuxt keeps linking the banner's CSS.

Pages outside client manifest mode also stop prefetching the client
manifest resolver and its translations (about 66 KB gzip), which they never
load at startup.

The plain Vue plugin's `ConsentRoot` loads the trigger as its own chunk
too.

### Link v3 package docs to v3.c15t.com

The `AGENTS.md` files and bundled docs in v3 packages linked to `c15t.com`,
which documents v2. Those links now point at `v3.c15t.com`, so an agent that
follows them from `node_modules` reads docs for the installed version.

### `c15t/react` exports the modes, defaulting to what the build downloaded

Import `manifest`, `hosted` and `offline` from `c15t/react`. React apps no
longer import anything from `@c15t/browser`. With `consentManifest()` from
`c15t/build` in the Vite config, `manifest()` needs no arguments: it reads the
policy snapshot and the backend URL from `c15t/generated`. `hosted()` reads
the same backend URL.
The plugin reads `VITE_C15T_BACKEND_URL`, then `VITE_INTH_PROJECT_URL`, and
`hosted()`'s missing-URL error names both outside production.

```tsx
import { ConsentProvider, manifest } from 'c15t/react';

<ConsentProvider options={{ mode: manifest() }}>{children}</ConsentProvider>;
```

Pass `snapshot`, `manifestURL`, `backendURL` or `source: 'runtime'` to
override the build's values. `@c15t/react` keeps these modes on its
`@c15t/react/modes` entry, so the Next.js and TanStack Start entries, which
re-export `@c15t/react`, never import the build's snapshot module.

The browser manifest resolver loads on demand. When the policy depends on a
location the page doesn't know, the browser asks `/init` and never downloads
the resolver. Otherwise the resolver starts loading as soon as `manifest()`
runs. Each language's base copy and the IAB vendor list load only when a
visitor needs them. The React quickstart's first-load JavaScript is about
3.8 KB gzip smaller.

With `preloadDialog: 'idle'`, the default, the deferred `ConsentDialog`
starts loading three seconds after the load event, in idle time, instead of
in the first idle time after it. Hovering, focusing or touching a button that
opens the dialog still loads it at once.

`ConsentTheme` and `defineTheme` are importable from the new
`c15t/react/theme` entry, which a Server Component can import.

Deprecated, still working: `Frame`, `FrameRoot`, `FrameTitle` and
`FrameButton`, the v2 names for `ConsentGate` and its parts, and the
`FrameProps` type. The components still render `ConsentGate`, and now log a
one-time warning outside production.

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
there too.

The config takes `backendURL` (default `NEXT_PUBLIC_C15T_BACKEND_URL`),
`mode` (`manifest()`, `hosted()` or `offline()`, exported as data from
`c15t/next`; `manifest()` by default), `routePrefix`, `journey`, and the
browser options `scripts`, `vendors`, `clearOnRevocation`, `networkBlocker`,
`persistence`, `scriptLoader` and `options`. `ConsentRoot` props win over the
config's. `options` merges one key at a time and `options.callbacks` one
callback at a time, so `options={{ nonce }}` keeps the config's callbacks.
`ConsentRoot` warns in development when it finds no config, and throws when
`manifest()` or `hosted()` has no backend URL instead of running offline: set
`NEXT_PUBLIC_C15T_BACKEND_URL` or `backendURL` in the config, or choose
`mode: offline()`.
`NEXT_PUBLIC_INTH_PROJECT_URL` works when `NEXT_PUBLIC_C15T_BACKEND_URL` is
unset: `withConsentManifest()` copies it to the c15t variable, so the browser
bundle still holds one value.
`options.mode` on `ConsentRoot` takes the same data, or a transport such as
`custom(transport)`; a `hosted()` or `offline()` transport from `c15t/react`
still works but warns in development, because its code is then in the
first-load bundle. With `manifest()` resolved on the server, the browser gets
no resolver, snapshot or other language.

`createConsentRoute()` serves `/manifest` and `/init` from one catch-all
route, such as `app/api/c15t/[...c15t]/route.ts`. Other paths under the
prefix return 404, or reach the backend with `proxy: true`. Set `routePrefix`
in the config to send the browser's init there; without it the browser calls
`${backendURL}/init`. Pages that `resolveConsent()` renders on the server don't
need the route.

To keep browser saves on your origin too, set `proxy: true` next to
`routePrefix` in the config, and pass `proxy: true` to `createConsentRoute()`
or `createPagesConsentRoute()`, which now takes it as well. The browser then
sends init and saves to `routePrefix`, while `resolveConsent()`, the route and
the build keep the absolute `backendURL`. This is the same option as TanStack
Start's `createConsentStateHandler({ proxy })`, and replaces pointing
`backendURL` at `/api/c15t` and passing the absolute URL to each server helper,
or a Next.js rewrite in the Pages Router.

`withConsentManifest()` writes the snapshot to `node_modules/.cache/c15t/`
and points `c15t/generated` at it, defaulting to
`NEXT_PUBLIC_C15T_BACKEND_URL`. Importing `c15t/generated` from a client
component fails the build, because the browser copy imports `server-only`.
The wrapper also adds `c15t`, `@c15t/core` and `@c15t/nextjs` to
`transpilePackages`, so Pages Router server code sees the snapshot and the
config. A failed download stops `next build` and warns in `next dev`; pass
`onBuildError` as the second argument, or set `C15T_ON_BUILD_ERROR`, to
change that. `output: 'export'` skips the download. So do the modes that
read no build-time manifest, as in Nuxt and Astro: `hosted()`, `offline()`,
`manifest({ snapshot })` and `manifest({ source: 'runtime' })` in
`c15t.config.ts`. A build in those modes never contacts the backend, so it no
longer needs `onBuildError: 'runtime'` when the backend is unreachable. The
wrapper also reads the config's `backendURL` before
`NEXT_PUBLIC_C15T_BACKEND_URL`, and a config `defineConsentConfig` rejects
stops the build. `defineConsentConfig` now checks the config on the server
and at build time only; browser bundles skip the checks and their messages.

The Pages Router gets `withConsentProps()`, a `getServerSideProps` that adds a
JSON-safe `consent` prop, and `ConsentPageProps` for `AppProps`:

```ts
// pages/index.tsx
export const getServerSideProps = withConsentProps();

// pages/api/c15t/[...c15t].ts
export default createPagesConsentRoute();
```

Removed, with no deprecated alias (these were v3 alpha only):

- `defineConsentConfig({ manifestURL, initURL })`: use `routePrefix`, or
  `mode: manifest({ resolve: 'browser', manifestURL })`.
- `ConsentRoot`'s `backendURL` prop: set `backendURL` in the config or
  `NEXT_PUBLIC_C15T_BACKEND_URL`. `config` is now an optional override.
- `createNextConsentRouteHandlers()` and its `manifestGET`: use
  `createConsentRoute()`.
- `createPagesApiHandlers()`: use `createPagesConsentRoute()` in a catch-all
  API route.
- The `manifest` option of `resolveConsent()` and `createConsentRoute()`: use
  `snapshot`, which defaults to the build's.
- `ConsentManifestOptions` and the `c15t.server.ts` pattern: use
  `ResolveConsentOptions` or `NextConsentRouteOptions` when you need them.
- `resolveStrictestDefaultInit` from `c15t/next/static`: use
  `resolveUnknownLocationInit`.
- `withConsentManifest()`'s `outputFile`, `exportName`, `importSource` and
  `rootDir` options, and the generated `c15t-manifest.ts`.

Changed: `hosted`, `offline` and `manifest` from `c15t/next` are now the data
factories. A `ConsentProvider` that needs a transport imports them from
`c15t/react`.

### Render children passed to `ConsentRoot` in Vue and Nuxt

`ConsentRoot` had no default slot, so wrapping an app in it, the way a React
app sits inside a provider, dropped everything inside without a warning and
the page never rendered. The Vue and Nuxt `ConsentRoot` now render their
default slot after the banner, dialog and trigger, on the server and in the
browser.

Keep rendering `<ConsentRoot />` next to your page content, such as
`<NuxtPage />`. It is not a provider, so wrapping adds nothing; this change
only stops a wrapped app from disappearing.

### Astro: `c15t()` with no options, one consent route and a components barrel

`c15t()` now works with no options. The backend URL defaults to
`PUBLIC_C15T_BACKEND_URL`, read from the environment or `.env` in the project
root, and the mode defaults to `manifest()`. `PUBLIC_INTH_PROJECT_URL` works
too when `PUBLIC_C15T_BACKEND_URL` is unset. The modes are the data factories
from `c15t/modes`, re-exported from `c15t/astro`:

```js
// astro.config.mjs, server output
export default defineConfig({
	adapter: node({ mode: 'standalone' }),
	integrations: [svelte(), c15t()],
	output: 'server',
});

// static output, no adapter
export default defineConfig({
	integrations: [svelte(), c15t({ mode: hosted() })],
});
```

- `backendURL` is a top-level option. `hosted({ backendURL })` of its own
  still wins.
- `manifest({ snapshot, source, resolve })` replaces
  `manifest({ backendURL, manifest })`. `source: 'runtime'` fetches the policy
  at runtime instead of bundling it at build time. `resolve: 'browser'`
  resolves the policy in the browser, so a static site with no adapter can use
  `manifest()`: the integration prerenders `/api/c15t/manifest` for it.
- `reportSessions` is a top-level option.
- `routePrefix` (default `'/api/c15t'`, `false` for none) replaces
  `endpoints`. The integration injects one catch-all route,
  `${routePrefix}/[...path]`, from the `c15t/astro/api` entry, which answers
  `init` and `manifest`.
- `clientEntrypoint` resolves a relative path from the project root, and
  defaults to `src/c15t.client.ts`, `.js` or `.mjs` when the file exists.
  The browser options no longer carry its absolute path.
- `ui` defaults to the framework of the one Astro UI integration the site
  registers, among `@astrojs/svelte`, `@astrojs/react` and `@astrojs/vue`, and
  to `'svelte'` otherwise.
- `c15t()` throws when a serialized option holds a function, naming where it
  is. A vendor helper such as `posthog()` in `scripts` used to lose its
  callbacks without a word; move it to `src/c15t.client.ts`.
- The integration adds the type of `Astro.locals.c15t` to `.astro/types.d.ts`.
  Remove the `/// <reference types="c15t/astro/middleware" />` line from
  `src/env.d.ts`.
- `c15t/astro/components` exports `ConsentBanner`, `ConsentDialog`,
  `ConsentDialogLink`, `ConsentScript`, `IABConsentBanner` and
  `IABConsentDialog`. `ConsentBannerDeferred` renders a server island, so it
  stays at `c15t/astro/components/consent-banner-deferred.astro`.
- Server-rendered `manifest()` and `hosted()` pages ship only the code that
  saves consent. The init path loads when a page inits again.
- `offline()` reports the location it resolved for, so the preference dialog
  shows its title.
- `manifest()` without a backend URL, from `backendURL` or
  `PUBLIC_C15T_BACKEND_URL`, fails at setup, including
  `manifest({ snapshot })` and any `routePrefix`. The consent route answers
  `GET` only, so saves used to fail after the visitor chose.

With `manifest()`, the integration fetches the policy manifest during
`astro build` and dev startup and bundles it into the server. Middleware and
the consent route use that snapshot; the browser options omit it unless the
mode resolves in the browser. The fetch is skipped for `hosted()`,
`offline()`, `manifest({ snapshot })`, `manifest({ source: 'runtime' })` and
a relative backend URL. If the fetch fails or takes longer than 10 seconds,
`astro build` now stops with an error, where it used to warn and continue,
and `astro dev` logs a warning and fetches the policy at runtime. Set
`onBuildError`, or `C15T_ON_BUILD_ERROR`, to change that.

Removed, with no deprecated alias (these were v3 alpha only):

- `hosted({ url })`: use `hosted({ backendURL })`, or the top-level
  `backendURL`. `hosted({ domain })` is gone too.
- `manifest({ backendURL, manifest, reportSessions })`: use the top-level
  `backendURL` and `reportSessions`, and `manifest({ snapshot })`.
- `endpoints` and the `c15t/astro/api/init` and `c15t/astro/api/manifest`
  entries: use `routePrefix`.
- `buildManifest`: use `onBuildError`, or `manifest({ source: 'runtime' })`
  for `buildManifest: false`.
- `c15t/astro/components/consent-dialog-trigger.astro` and
  `ConsentDialogTrigger`: use `consent-dialog-link.astro` and
  `ConsentDialogLink`.
- `resolveTransportFactory`, `custom` and the `C15tModeDescriptor`,
  `C15tHostedDescriptor`, `C15tManifestDescriptor`, `C15tOfflineDescriptor`
  and `C15tEndpointOptions` types. Modes are `ConsentMode` from
  `c15t/astro`.
- `c15t/astro/api` no longer exports the route handlers. Import
  `createConsentRouteHandlers` and the manifest cache helpers from
  `c15t/astro/server`.

### Vue and Nuxt pick the policy source with `mode`

**Nuxt.** Set `mode` in `nuxt.config.ts` with `manifest()`, `hosted()` or
`offline()` from `c15t/vue`. The default is `manifest()`: the build downloads
the policy, the server resolves each visitor, and the browser ships no
resolver or snapshot. One catch-all consent route answers
`${routePrefix}/init` and `${routePrefix}/manifest`; `routePrefix` defaults
to `/api/c15t`, and `false` adds no route. For `nuxt generate` and other
static hosting, use `manifest({ resolve: 'browser' })` with
`routePrefix: false`: only then does the browser bundle get the snapshot.
`nuxt generate` with a server-resolved `manifest()` now logs a warning that
says so.

```ts
import { manifest } from 'c15t/vue';

export default defineNuxtConfig({
	c15t: { mode: manifest({ resolve: 'browser' }), routePrefix: false },
	modules: ['c15t/vue'],
	ssr: false,
});
```

`mode` and `routePrefix` are read from `nuxt.config.ts` only; `app.config.ts`
keeps `scripts`, `callbacks` and other runtime options. The module now
auto-imports every composable `c15t/vue/vue-plugin` exports, including
`useHasConsentPolicy`, `useHasConsentUi`, `useHasConsentPreferences` and
`useIabTranslations`.

The module bundles the manifest during `nuxt build` and dev startup, reading
`NUXT_PUBLIC_C15T_BACKEND_URL` when the `c15t` key sets no `backendURL`. The
fetch is skipped for `hosted()`, `offline()`, `manifest({ snapshot })`,
`manifest({ source: 'runtime' })`, a relative backend URL and `nuxt prepare`.
If the fetch fails or takes longer than 10 seconds, `nuxt build` now stops
with an error, where it used to warn and continue, and `nuxt dev` logs a
warning and fetches the policy at runtime. Set `onBuildError` under the `c15t`
key, or `C15T_ON_BUILD_ERROR`, to change that. Use
`manifest({ source: 'runtime' })` to always fetch at runtime, so policy edits
apply without a rebuild. `manifest()` without a backend URL, including
`manifest({ snapshot })`, now stops `nuxt build` and `nuxt dev` with an error
naming `NUXT_PUBLIC_C15T_BACKEND_URL`: the consent route answers `GET` only,
so saves used to fail after the visitor chose.
`NUXT_PUBLIC_INTH_PROJECT_URL` works when `NUXT_PUBLIC_C15T_BACKEND_URL` is
unset, at build time and on a running server; `consentManifest()` from
`c15t/vue/vite` reads `VITE_INTH_PROJECT_URL` the same way.

**Vue.** `app.use(c15tVue, { mode })` requires a mode: `manifest()`,
`hosted()`, `offline()` or `custom()` from `c15t/vue/vue-plugin`.
`manifest()` and `hosted()` read the backend URL and policy that
`consentManifest()` from `c15t/vue/vite` downloaded, served as
`c15t/generated`. `manifest({ manifestURL })` fetches that URL when the app
starts instead of using the snapshot. The client manifest mode uses the
shared browser resolver, so it no longer downloads every language. The same entry exports the
components, so `ConsentRoot`, `ConsentDialogLink` and the rest import from
`c15t/vue/vue-plugin`. `consentManifest()` is now the only Vite plugin; the
package resolves its runtime imports itself. `@c15t/vue` declares
`sideEffects`, so bundlers drop what an app doesn't import.

```ts
import { c15tVue, manifest } from 'c15t/vue/vue-plugin';

createApp(App).use(c15tVue, { mode: manifest(), scripts }).mount('#app');
```

Removed, with no deprecated alias (these were v3 alpha only):

- Nuxt options `manifest`, `manifestURL`, `manifestSnapshot`, `buildManifest`,
  `geoURL`, `initRoute` and `manifestRoute`. Use `mode`, `routePrefix`,
  `onBuildError` and `manifest({ manifestURL, geoURL, snapshot })`.
- The `NUXT_PUBLIC_C15T_MANIFEST_URL` and `NUXT_C15T_MANIFEST_URL`
  environment variables. Set `mode: manifest({ manifestURL })` in
  `nuxt.config.ts`. `NUXT_PUBLIC_C15T_BACKEND_URL` and
  `NUXT_C15T_BACKEND_URL` still work.
- The Nuxt option `domain`. Saves send the page's hostname.
- `ConsentPreferencesLink`. It is `ConsentDialogLink`, at
  `runtime/components/consent-dialog-link.vue`. The floating
  `ConsentDialogTrigger` stays.
- `ConsentFrame`. Use `ConsentGate`.
- Vue plugin options `backendURL`, `manifest`, `manifestSnapshot`,
  `manifestURL`, `customFetch` and `domain`. Pass them to the mode instead.
- The default `c15tVue` export of `c15t/vue/vite`: use `consentManifest`. The
  app plugin keeps the name `c15tVue`.
- The `c15t/vue/consent-root` and `c15t/vue/consent-widget` subpaths.
- `consentManifest()`'s `outputFile`, `exportName`, `importSource` and
  `rootDir` options, and the generated `c15t-manifest.ts`.

`offline()` now reports the location it resolved for, so the preference
dialog shows its title.

**Location-based policies in the browser.** When the policy depends on the
visitor's country or region and the browser has no location, the Vue
plugin's `manifest()` and Nuxt's `manifest({ resolve: 'browser' })` now ask
the backend's `/init`, as React, Svelte and `@c15t/browser` do. They used to
apply the rule for an unknown location without a request, which could be
another region's rules. Pass `inputs` or `geoURL` to resolve in the browser,
or `initFallback: false` to the Vue plugin's `manifest()` to keep the old
behaviour. `consentManifest()` from `c15t/vue/vite` now warns when a
`manifest()` build bundles such a policy, and suggests `hosted()`.

## c15t@3.0.0-alpha.8 (alpha)

### Link a page's `/init` to the save that follows

c15t now sends a random journey id on `GET /init` and `POST /subjects` as query
parameters (`c15tJourney`, `c15tJourneyScope`, plus `c15tStored` on `/init`).
Session reports gain `journey: { id, scope, storedChoice, prompt, domain }`, so
a backend can link a page load to the choice that follows without
fingerprinting or extra requests.

Set `journey` to choose how long the id lives: `'page'` (default, in memory),
`'tab'` (in `sessionStorage` while a prompt is due, on pages the browser
resolves) or `false`. In Next.js set it in `defineConsentConfig`; in TanStack
Start pass it to both `resolveConsent` and `ConsentRoot`. Vue, Svelte, Astro and
the script tag use `'page'` for now.

Request URLs now carry a query string. If you pass `hosted()` a `fetch` that
routes on the exact URL, match the path instead.

### Stream the banner before hydration

When `ConsentRoot`'s `state` (or `prefetch`) is a promise, `ConsentBanner` now
renders on the server once it resolves and follows the page in a later chunk of
the same response, visible before hydration. It shows only when the resolved
policy calls for a banner; otherwise it mounts after hydration as before. Set
`streamBanner: false` in the provider options to keep the old behavior.

## c15t@3.0.0-alpha.7 (alpha)

### Share Next.js consent options with `ConsentManifestOptions`

Pass one options object to `resolveConsent` and the consent route handlers, so
both use the same build-time snapshot:

```ts
export const consentOptions = {
	config: consentConfig,
	manifest: consentManifest,
} satisfies ConsentManifestOptions;
```

`createNextConsentRouteHandlers` and `createPagesApiHandlers` now accept
`config`.

### Share TanStack Start consent options with `ConsentManifestOptions`

Pass one options object to `createConsentStateHandler` and
`createConsentServerRoute`, so both use the same build-time snapshot:

```ts
export const consentOptions = {
	backendURL: 'https://your-project.inth.app',
	manifest: consentManifest,
} satisfies ConsentManifestOptions;
```

## c15t@3.0.0-alpha.6 (alpha)

### Report who runs the backend as `window.c15t.hosting`

`c15tInstance()` takes a `hosting` option, `'self-hosted'` by default or `'inth'` on Inth's platform. `/init` and `/manifest` report it, and the browser exposes it as `window.c15t.hosting` and the snapshot's `hosting`. It is not signed, so treat it as a debugging signal.

### Build Next.js Pages Router apps without `transpilePackages`

A Next.js app with only a `pages/` directory builds with c15t's stock dialog.
Before, webpack builds failed with "Global CSS cannot be imported from within
node_modules" unless the app set `transpilePackages`, and Turbopack failed on
linked installs.

`styles.css` includes the preference dialog and widget rules again, and no
`@c15t/react` or `@c15t/ui` module imports CSS. The render-blocking stylesheet
grows by about 4.5 kB gzip.

`@c15t/ui/styles/dialog.css`, the `@c15t/ui/styles/dialog` module and
`c15t/astro/dialog.css` are now empty. They still resolve, so existing imports
keep building. Remove them.

### Add IAB Global Privacy Platform support

Every framework can install the GPP 1.1 CMP API (`__gpp`) and keep its GPP
string in step with the visitor's choices.

- React, Next.js and TanStack Start: render `ConsentGPP` from `@c15t/react/gpp`
  (`c15t/react/gpp`) inside the consent provider or `ConsentRoot`.
- Vue, Nuxt, Svelte, SvelteKit and Astro: set the `gpp` option. `gpp: true` uses
  the defaults.
- `@c15t/browser`: call `mountGPP(client)` from `@c15t/browser/gpp`, or load
  `c15t.gpp.js` next to the main script tag.
- `createConsentRuntime()` takes `gpp` with
  `loadGPP: () => import('@c15t/iab/gpp')`, and `createGPP()` from
  `@c15t/iab/gpp` mounts the API on any consent kernel.

The GPP code loads only when you use it.

The matched policy rule picks the section. An `iab` rule maps the TC String to
`tcfeuv2`. A rule with the `preferences` or `opt-out` right gives US visitors
their state section, or the US National section when the state is unknown or has
none. `usFallback: 'none'` turns that fallback off and `usApproach: 'national'`
always uses it. Indiana, Kentucky, Maryland and Rhode Island are not encoded yet
and get the fallback.

If another CMP already owns `__gpp`, c15t leaves it in place. The `gpp` option
reports the conflict to `onError`, `ConsentGPP` logs it, and `mountGPP()` and
`createGPP()` throw.

### Open DevTools from the consent trigger toolbar

With `<ConsentDevTools>` mounted next to a visible `ConsentDialogTriggerToolbar`
or `ConsentDialogTrigger`, the trigger shows a DevTools button and DevTools
hides its floating launcher, so the two no longer overlap.
`ConsentDialogTrigger` becomes a two-button toolbar. The panel opens beside the
toolbar and follows it when dragged. DevTools restores its own launcher when no
trigger is visible.

For hosts that render their own launcher, DevTools instances gain
`dock(placement | null)` and `DevToolsState` reports the current `dock`.

### Open DevTools from the Vue consent trigger

With `ConsentDevTools` from `c15t/vue/devtools` mounted next to a visible
`ConsentDialogTrigger`, the trigger becomes a two-button toolbar with a DevTools
button, and DevTools hides its floating launcher. The panel opens beside the
toolbar and follows it when dragged. DevTools restores its own launcher when the
trigger is hidden. Style the toolbar with the `components.trigger.toolbar`,
`toolbarItem` and `toolbarIcon` parts.

### Warn when an experiment's banner asks about no category

When an experiment arm's banner runs under a policy that asks about no optional
category, accepting or rejecting records only a notice acknowledgement.
`onChoiceRecorded` never fires and the experiment counts impressions only. This
happens under a permissive rule when the site declares no categories through
`consentCategories`, `scripts` or `vendors`. c15t logs a warning outside
production the first time it happens.

### Generate consent manifests during application builds

Add opt-in build-time manifest snapshots for Next.js, TanStack Start, Astro,
Nuxt and Vite apps. Build plugins take `backendURL` and fetch its `/manifest`.
Server helpers and consent routes resolve from the snapshot without fetching
an upstream manifest. Geography, language, privacy signals and stored consent
still resolve per visitor.

Snapshots stay fixed until the next build. Use runtime fetching for policy
updates that must apply without a rebuild. A manifest fetch failure or
invalid snapshot fails the build. Consent saves, session reports and IAB
vendor lists still call the backend.

Svelte's framework-free `resolveConsent` also accepts a snapshot. Both Svelte
server helpers take a background-work callback to keep session reports alive
on serverless hosts without `waitUntil`.

Next.js runtime manifest requests use the App Router Data Cache with a
300-second revalidation. `manifestRevalidateSeconds: false` skips that cache
instead of caching indefinitely.

### Add `ExperimentArmName` for typing a flag's arm

`ExperimentArmName<typeof experiment>` is `'control'` plus the arm names of an
experiment built with `defineExperiment()`. Use it to check a feature flag's
value before passing it as `arm`. Import it from `c15t`.

### Export category, cleanup and policy types from the framework entries

You can type `consentCategories`, `clearOnRevocation` and
`offline({ policyRules })` from the same import as the provider.

- `c15t/react`, `c15t/next` and `c15t/tanstack-start` add `AllConsentNames`,
  `ClearOnRevocationConfig`, `PolicyRule` and `policyRulePresets`.
- `@c15t/svelte` adds `ClearOnRevocationConfig`, `PolicyRule` and
  `policyRulePresets`.
- `c15t/astro` adds `ClearOnRevocationConfig`.
- `c15t/vue` adds `AllConsentNames` and `ClearOnRevocationConfig`.

Importing them from `c15t` keeps working.

### `ConsentProvider` requests `/init` sooner

In a client render, `ConsentProvider` with `hosted()` and no `prefetch` sends
`/init` during its first render instead of after mount, so the banner shows
sooner (about 38 ms on a throttled mobile profile). Server renders, hydration
and apps with a `prefetch` or `ConsentRoot` keep the previous timing.

## c15t@3.0.0-alpha.5 (alpha)

### Send the consent model as `model` on save

The `/subjects` save body names the consent model `model`, the same name the rest of the v3 API uses. It was `jurisdictionModel`, the last v2 jurisdiction name on the v3 wire.

- `@c15t/core` and the native iOS and Android cores send `model`.
- The backend reads `model` and still accepts `jurisdictionModel` from 2.x clients. When a save carries both, `model` wins.
- `postSubjectInputSchema` adds `model` and marks `jurisdictionModel` deprecated.

The backend only reads this field when a save has no policy decision. Deploy this backend with these clients: an older v3 alpha backend ignores `model`, so its consent records for such saves have no model.

### One preference draft for every framework

React, Vue, Svelte and the `@c15t/browser` preference dialog now share one
draft, `createPreferenceDraft` from `c15t/preference-draft`, so unsaved
choices behave the same everywhere:

- **Stale drafts.** A draft with an unsaved change goes stale when the
  policy, the displayed categories or the vendor list changes. Saving it
  records nothing until the visitor reviews it (`reset()`). A draft with no
  unsaved change follows the policy and is never stale; Vue used to mark it
  stale. The `@c15t/browser` dialog used to drop unsaved changes silently;
  it now shows a review notice.
- **Choices saved elsewhere.** When another surface or tab records a choice,
  switches the visitor left alone take the new value and moved ones keep
  theirs. React used to write the old values back on save.
- **Category order.** Every preference form, and `runtime.consentCategories`,
  lists categories in one fixed order: necessary, functionality,
  measurement, experience, marketing. Vue and `@c15t/browser` used the
  configured `consentCategories` order.
- **Draft values.** `values` lists every category; ones the policy does not
  offer read `false`. Vue and Svelte listed only the displayed ones.
- **Late defaults.** Presentation defaults from an experiment arm assigned
  after the dialog opened apply only while the visitor has changed nothing.
- **IAB dialog in Vue.** Each switch writes the CMP selection at once, as in
  React and Svelte. Closing the dialog keeps those changes, and saving can
  no longer overwrite a newer receipt with an older copy.

React's banner buttons no longer load the draft: it ships with the
preference dialog, which takes about 1.4 KB gzip off the first load of a
page that renders a banner. The `@c15t/browser` ES module build loads its
preference dialog and the draft as a separate chunk, in idle time once the
banner or trigger shows; the script-tag files stay one file each.

In Svelte the draft now ships with `ConsentWidget` and `ConsentDialog`
instead of `ConsentManagerProvider`. The state API keeps its synchronous
shape. `setSelectedConsent()` calls made before the draft loads apply in order
when it lands, and `saveConsents('custom')` waits for it.

**Breaking:** in headless Svelte code that renders neither component,
`selectedConsents` and `draft` read empty on first use, because the draft
loads then, and fill in reactively once it lands. A one-off read outside a
reactive context gets the empty values. Migration: read them in a reactive
context (`$derived`, `$effect` or markup).

**Breaking:** the runtime's `stageVendorConsent()` and `resetVendorDraft()`
are removed. Pass vendors to the save
(`kernel.commands.save({}, { vendors: { 'x-pixel': false } })`) or stage
them on a preference draft. Vue's `useConsentDraft()` returns
`displayedCategories` and `vendors` as computed refs, takes no argument, and
no longer has `reseedOnNextRecord()`; call `reset()` after a bulk save
instead.

### Every adapter closes consent surfaces the same way

Accept, reject and save now decide which surface shows next through one module in `@c15t/core`, so React, Vue, Nuxt, Svelte, Astro and `@c15t/browser` behave alike:

- After a choice, the banner shows only while the policy still owes a choice or a notice. A choice saved while the policy is still loading, or after it failed to resolve, no longer brings the banner back in Vue, Nuxt and `@c15t/browser`.
- A banner reopened for a visitor who already chose now closes once the new choice is recorded in React and Svelte, as it already did in `@c15t/browser`.
- On Astro, `acceptAll()`, `rejectAll()` and the banner's Accept and Reject buttons go through the IAB CMP under an IAB policy, so the TC string records the choice. Before, they saved categories only. `acceptAll()`, `rejectAll()` and `save()` now also close an open banner or dialog once the choice is recorded.

The rules are public at `c15t/surface-actions` (`@c15t/core/surface-actions`) for custom UI: `hasConsentUI()`, `hasConsentPreferences()`, `showConsentSurface()`, `saveConsentSurface()`, `saveIABConsentSurface()` and `saveConsentBlanket()`.

### React provider on the shared runtime

`@c15t/react`'s `ConsentProvider` now renders the runtime from
`createConsentProviderRuntime`, the same one the Svelte provider uses, instead
of its own copy. Its props, hooks and the `runtime` prop are unchanged.
`ConsentRoot` in `@c15t/nextjs` and `@c15t/tanstack-start` picks this up.

**Breaking.** `persistence` and `storageConfig` are read once, when the
provider mounts. A new storage key used to move the stored choice to the new
key; now the choice stays where it was, data clearing keeps protecting that
key, and a warning is logged outside production. The same applies to every
provider runtime, including Svelte's. Migration: remount the provider to move
storage.

Behaviour that changes:

- A `prefetch` that is still marked `initialPolicyPending` is no longer
  adopted as the answer: the provider sends `/init`.
- Adopting a server-resolved `prefetch` raises `init:applied`, as an `/init`
  response does.
- A streamed `prefetch` that carries an experiment but arrives after mount
  keeps `experiment` in the `/init` request the provider falls back to.
- A provider rendered under a `consentSource` raises `init:applied` once the
  source is connected.
- After mount, a new `user`, `vendors`, `scripts` or blocker options apply
  once a small chunk has loaded, the first time options change. `enabled`,
  `overrides` and `consentCategories` still apply at once, and requests that
  new network rules match are held until the blocker has them.

`ConsentProvider` loads the code that applies a `prefetch` promise only when it
gets one, so an app that never streams consent state doesn't download it.
`ConsentRoot` in `@c15t/nextjs` and `@c15t/tanstack-start`, whose `state` is
usually streamed, ships that code in its first-load chunk, so a streamed state
applies as soon as it arrives instead of after one more request.

`@c15t/react`'s index now re-exports its values in groups with `export *`.
The names are the same. Under esbuild's code splitting, an app that imports
only `ConsentProvider` or a hook no longer loads the dialog trigger, branding
and draft modules on first load, because the deferred dialog no longer pulls
every module the index names into the first chunk.

`@c15t/ui`'s `setupColorScheme` moves to its own module,
`@c15t/ui/utils/color-scheme`. A provider that sets the color scheme no longer
shares a chunk with the dialog's focus-trap and scroll-lock helpers.
`@c15t/astro` imports it from the new path.

**Breaking.** `@c15t/ui/utils/dom` no longer exports `setupColorScheme`.
Migration: import it from `@c15t/ui/utils/color-scheme` or `@c15t/ui/utils`.
The old path is not kept as a re-export: Vite 8 (Rolldown) counts unused
imports when it checks a build's chunks for cycles, and in TanStack Start that
re-export closed one, so each module a lazy chunk shared with the route became
its own first-load file.

### Provider runtime

- `c15t/runtime/provider` (`@c15t/core/runtime/provider`) exports what a
  provider that loads modules on demand needs: `createConsentProviderRuntime`,
  `lazyRuntimeModule` and `lazyStreamPrefetch`, which loads the
  streamed-prefetch code only for a runtime whose `prefetch` is a promise.
  Importing `c15t/runtime` instead can keep the statically imported default
  modules in the first chunk under esbuild.
- `update()` returns a promise that settles once every change has applied.
  The comparison behind it loads with the first `update()`.
- A `consentSource` connects through a new `connectConsentSource` module
  (part of `defaultRuntimeModules`). The React provider imports it on demand;
  until it connects, no optional category is granted.
- IAB mounts through a new `mountIAB` module (`mountRuntimeIAB`, part of
  `defaultRuntimeModules`). A provider that passes its own modules without it
  ignores `iab`.
- With a script loader that loads on demand, data clearing now subscribes after
  the loader has loaded, so revocation callbacks run before browser data is
  removed.
- `persistence.now` is passed through to persistence; the runtime used to drop
  it.

### Vue IAB "Reject all" no longer consents to Purpose 1

"Reject all" on the Vue and Nuxt IAB banner and dialog, and `useConsentIabSave()('none')`, recorded consent to Purpose 1 (store and access information on a device) and encoded it in the saved TC string. "Accept all" and "Reject all" now use the IAB CMP's own `acceptAll()` and `rejectAll()`, which React and Svelte already call. Reject all refuses every purpose, and both actions now record a choice for every vendor, including vendors and custom vendors that declare no consent or no legitimate-interest purposes, so the TC string discloses the same vendors as other frameworks. With no IAB CMP mounted (no valid `cmpId`, or `consentSource` is set), `'all'` and `'none'` now record nothing, as in React and Svelte, instead of saving without a TC string.

**Breaking.** `buildAcceptAllIab()` and `buildRejectAllIab()` are no longer exported from `@c15t/vue/vue-plugin`, `#c15t/composables`, `@c15t/vue/composables/iabSelection`, or the matching `c15t/vue/vue-plugin` and `c15t/vue/composables/iabSelection` entries. Call `useConsentIabSave()` with `'all'` or `'none'` instead.

### One manifest cache for every server adapter

Next.js, Nuxt, SvelteKit, Astro and TanStack Start now read the backend manifest through one function, `fetchCachedManifest` from `@c15t/core/server`, and share one in-process cache of up to 128 entries. Before, SvelteKit and Astro kept a separate 64-entry cache and Next.js a third one, and each took different options.

The cache key is now the same for every caller. Query parameters are sorted by name and the URL fragment is dropped, so `?b=2&a=1` and `?a=1&b=2` read one entry and reach the backend as one request. That request keeps the first caller's URL and query as written, so a signed `manifestURL` still verifies. Request headers that equal the ones the cache sends anyway (`accept: application/json` and the c15t protocol headers) no longer split the cache. The `init` option passes a framework fetch hint such as Next.js `{ next: { revalidate } }` and is not part of the key.

**Breaking.**

- `@c15t/core/libs/manifest-cache` and `c15t/libs/manifest-cache` are removed. Import `fetchCachedManifest` and `clearManifestCache` from `@c15t/core/server` (`c15t/server`) and pass `sourceURL` instead of `url`. The `CachedManifest` type is now `CachedManifestResponse`.
- `fetchCachedManifest` from `@c15t/core/server` and `@c15t/astro/api` takes `sourceURL` instead of `config` (build it with `resolveManifestSourceURL({ backendURL, manifestURL })` from `@c15t/core/server`), and reads the shared cache. The `ManifestSourceConfig` type is removed; use `ManifestSourceOptions`.
- `@c15t/vue/runtime/server/manifest-mode` and `c15t/vue/runtime/server/manifest-mode` are removed. Import the manifest cache and its helpers from `@c15t/core/server` instead, and `resolveManifestInit` and `getResolverInputsFromHeaders` from `@c15t/core/transports/manifest-cache`; `clearManifestRouteCache()` is `clearManifestCache()`.

### A smaller public interface for `@c15t/core`

`@c15t/core` (and `c15t`) stops exporting kernel verbs only its own modules
call, building blocks no adapter uses, and a second home for the manifest
cache.

**Kernel (`ConsentKernel`)**

| Removed | Use instead |
| --- | --- |
| `kernel.hydrate(records)` | Pass `initialRecords` to `createConsentKernel()`, or mount `createPersistence()` from `c15t/modules/persistence`. |
| `kernel.markLive()`, `kernel.holdSaves()`, `kernel.events.emit()` | Nothing; the runtime and persistence call them. |
| `kernel.set.vendorDraft(values)` | `kernel.commands.save(input, { vendors })`, or a preference draft's `setVendor()`. |

`kernel.getRecordsGeneration()` stays and is now documented.

**Runtime**

| Removed or renamed | Use instead |
| --- | --- |
| `runtime.onIABChange(listener)` | `runtime.subscribe(listener)`, and read `runtime.iab` inside the listener. |
| `createRuntimeKernel`, `hasResolvedPrefetch`, `normalizeKernelUser`, `resolveRuntimeTranslations`, `stringifyRuntimeError`, `ALL_CONSENTS_GRANTED` from `c15t/runtime` | Nothing; `createConsentRuntime` and `createConsentProviderRuntime` cover them. |
| `createPersistence(options, loader)`, `preloadPersistenceWriter()` | `createPersistence(options)`. |

`runtime.setOverrides()` merges into the current overrides, as it always
did; the docs used to say it replaces them.

**Server**

The manifest cache (`fetchCachedManifest`, `createManifestCache`,
`clearManifestCache`, `ManifestUnavailableError` and the manifest header
helpers) is exported from `@c15t/core/server` (`c15t/server`) only.
`@c15t/core/transports/manifest-cache` keeps `resolveManifestInit`,
`getResolverInputsFromHeaders`, `withResolutionBudget` and
`DEFAULT_RESOLVE_TIMEOUT_MS`.

These are no longer exported from `c15t/server`: the consent-proxy helpers
(`forwardConsentRequest`, `buildConsentProxyRequestHeaders`,
`buildConsentProxyResponseHeaders`, `filterCookieHeader`,
`rewriteProxySetCookie`, `stripIdentityForCleartext`, `isCleartextRemoteURL`,
`isConsentProxyPathAllowed`, `resolveConsentProxyOptions` and the
`CONSENT_PROXY_*` constants), the session-report helpers
(`reportConsentSession`, `buildConsentSessionReport`,
`forwardSessionReportHeaders`, `isSpeculativeRequest`,
`resolveSessionReportBackendURL`, `SESSION_REPORT_*`), `resolveConsentInit`,
`GVL_FETCH_TIMEOUT_MS` and `getManifestAge`. Use
`createConsentRouteHandler()`, which runs all of them.

**Root index**

No longer exported from `@c15t/core` / `c15t`: `setCookie`, `getCookie`,
`deleteCookie`, `deleteConsentFromStorage`, `CONTROL_ARM`,
`experimentArmRef`, `startExperiment`, `resolveExperimentPresentation`,
`disabledPolicyResolution`, `extractConsentNamesFromCondition`,
`hasRevokedPermission`, `initResponseToKernelConfig`,
`kernelConfigToInitResponse`, `mergeInitResponseIntoKernelConfig`,
`resolveVendors`, `vendorRenders`, `resolveWindowDebugMode`,
`createGvlReferenceURL`, `deferInitGvlToRoute`, `serveGvlReference`,
`validateExplicitChoice` and `validateNoticeDismissal`. Consent storage
belongs to the persistence module; `getRootDomain` stays for
`storageConfig`.

**Smaller pages**

The inline script that starts `/init` before the app loads (Nuxt `ssr: false`
pages, Next.js, TanStack Start, Astro) is 712 B gzip instead of 1,054 B.

**`@c15t/vue`**

**Breaking.** `@c15t/vue/runtime/utils/save-iab-choice` and
`c15t/vue/runtime/utils/save-iab-choice` are removed. Their
`saveIABChoice(kernel, save)` only called `saveIABConsentSurface(kernel, save)`
from `@c15t/core/surface-actions` (`c15t/surface-actions`); import that
instead.

**`@c15t/browser`**

`client.consentCategories` lists the policy's categories in the dialog's
fixed order: `necessary`, `functionality`, `measurement`, `experience`,
`marketing`. It used to put the configured `consentCategories` order first.

### Vue and Nuxt on the shared runtime

The `c15tVue` plugin and the Nuxt module now build their consent runtime with
`createConsentProviderRuntime` from `@c15t/core`, the runtime React and Svelte
use, instead of their own copy. Plugin options, module options, composables
and components keep their names and shapes.

New: the `iab` option sets IAB TCF publisher settings for the CMP Vue mounts
under an `iab` policy, such as `publisherRestrictions` and
`publisherCountryCode`. Vue apps had no way to set restrictions before, and
mounting the CMP reset them to none. Fields left out still come from `/init`,
and `iab: false` mounts no CMP.

Behaviour that changes:

- On a Nuxt page with `ssr: false`, the plugin starts the runtime before the
  app mounts, so `/init` runs while the app mounts instead of after it.
- Clearing records before the runtime starts, or without browser storage, now
  also clears the vendor choice.
- Experiment arms are checked against your `theme`, so an arm that is only
  balanced together with your theme's `consentActions` is no longer rejected.
- A `Sec-GPC` signal from the request stays active when the browser reports
  `navigator.globalPrivacyControl === false`, as in every other adapter.
  Vue used to switch it off.
- The script loader, network blocker, data clearing and a `consentSource`
  connection load as separate chunks, only for apps that configure them.
  Consented scripts mount once the script loader has loaded, matching
  requests stay held until the network blocker has, and optional categories
  stay denied until a `consentSource` connects.
- The Nuxt module stops Nuxt adding `rel="prefetch"` hints for c15t chunks
  a page loads only when it configures them or after its first banner (the
  modules above, live option updates, the save path and the preference
  dialog, which c15t warms after the page's `load` event). The IAB banner,
  the experiment controller and the client manifest resolver keep their
  hints.
- Changes to the Nuxt `c15t` app config while the page runs, such as
  `updateAppConfig()`, now reach the runtime: scripts, network and iframe
  blocking, vendors, categories, callbacks and `reloadOnConsentRevoked` follow
  them.
- A plain Vue `prefetch` without a resolved policy no longer skips `/init`.

The object `useConsentKernelContext()` returns gains `runtime`, `start()`,
`setOverrides()` and `update()`.

**Breaking.** That object no longer has `initialRecords`
(`useConsentKernelContext` from `@c15t/vue/composables/kernel` and
`c15t/vue/composables/kernel`). Read the records from the snapshot instead:
`useConsentSnapshot().value` has `explicitChoice`, `subject`,
`noticeDismissal` and `vendorChoice` once storage or the prefetch has
hydrated the kernel.

`@c15t/core`: a runtime `prefetch` whose `initialRecords` names only a
subject, as an `/init` answer's `subjectId` does, no longer counts as records
the server read. Storage hydrates the kernel as it would without a prefetch,
so a stored choice applies, and the named subject stays unless storage holds
its own.

### Route files that import `consentLoaderOptions` no longer pull consent code into other chunks

Route definitions ship to the browser, so a route file that imports `consentLoaderOptions` from `@c15t/tanstack-start/server` used to bring the server helpers' imports of `@c15t/core` into the client build's module graph. Vite split chunks by that graph: each consent route loaded about 3 KB more gzip in 5 extra files, and routes without c15t loaded 5 extra files too.

Browser builds now resolve `@c15t/tanstack-start/server` (and `c15t/tanstack-start/server`) to a build that exports `consentLoaderOptions` and nothing else that imports code. `resolveConsent()`, `createConsentStateHandler()` and `mergeInitIntoConsentState()` keep their names there so client code still builds, but calling one in the browser throws: they read the request and run on the server only.

### Remove the v2 `jurisdiction` label and `disableGeoLocation`

v3 decides consent from policy rules, so the regulation label v2 derived from a fixed country table (`GDPR`, `CCPA`, `NONE` and so on) is gone from the API.

- `/init` responses and session reports no longer carry `jurisdiction`, so `sessions.onReport` no longer receives it. Read the matched policy from `policyResolution`, or the report's `policy`, `country` and `region`.
- `@c15t/schema` removes `jurisdictionCodes`, `jurisdictionCodeSchema`, `JurisdictionCode` and `checkJurisdiction`. `@c15t/core` and `c15t` remove the unused `LocationInfo`, `ConsentBannerResponse` and `JurisdictionCode` types.
- The `disableGeoLocation` manifest option is removed. To show every visitor the same banner, configure one policy rule with `match: { isDefault: true }`; the browser resolves it without a location. To test a region's rule, set the country in the client's `overrides`, for example `overrides: { country: 'US' }`.
- The `/init` translations schema is now one shape with optional keys. `completeTranslationsSchema`, `partialTranslationsSchema` and the `partial*` section schemas are removed, along with the deprecated `frame` key, which the backend already folds into `consentGate`. `titleDescriptionSchema` now accepts a pair with `title` or `description` missing, so its inferred type has both fields optional.
- The backend still accepts `jurisdiction` in a save request from a 2.x client and ignores it. Policy snapshot tokens no longer carry the claim, and tokens that still do are accepted.
- Migration 7 makes `runtimePolicyDecision.jurisdiction` nullable; new decisions store `null` and 2.x rows keep their value. Apply it with `@c15t/cli self-host migrate --apply` before deploying this backend.

### One consent route handler for every server adapter

The `/manifest` and `/init` routes of Next.js, TanStack Start, SvelteKit, Astro and Nuxt now run on one handler, `createConsentRouteHandler` from `@c15t/core/server`. Each adapter keeps its own entry point (route handlers, server routes, `RequestHandler`, `APIRoute`, h3 event handlers) and the same options. The copies had drifted; every adapter now follows these rules:

- The manifest route passes only a `language` query parameter that looks like a language tag to the backend. Other parameters a visitor adds are dropped, so they no longer reach the backend or add manifest cache entries. SvelteKit, Astro and Nuxt used to forward the whole query string.
- The manifest route passes `cache-control`, `etag`, `last-modified` and `content-language` through, sends an adjusted `age`, and answers a matching `If-None-Match` with `304`. It never adds a `cache-control` header the backend did not send.
- The init route negotiates the policy contract in every adapter (before, only Next.js and Nuxt did), always answers with `x-c15t-policy-contract: 1`, and echoes `resolvedOverrides` and `resolvedPrivacySignals` (Next.js did not). A resolution that did not match carries no `policySnapshotToken`, `gvl`, `gvlReference`, `cmpId` or `customVendors`.
- A vendor list that cannot be loaded fails the init request. Astro answered `gvl: null`, which the browser reads as "IAB is off". The default vendor-list fetch now goes through the shared server cache with a five-second deadline. SvelteKit and Astro used an uncached fetch, and SvelteKit's had no deadline.
- When the manifest cannot be read and `backendURL` is set, the init route asks the backend's own `/init` and passes on its `vendors`, `vendorListVersion` and `resolvedPrivacySignals`. This covers backends without `/manifest`. It was Nuxt-only.
- A session report is skipped when the request was aborted before the route answered, in every adapter. The rest of an aborted request goes to the platform's `waitUntil`.
- `x-c15t-timeout-ms` on an init request bounds the manifest read, the vendor list and the `/init` fallback, in every adapter. Nuxt's server render already sent it.
- With `proxy` on, the manifest request carries the cookies `cookieNames` names and the extra `forwardHeaders` in SvelteKit too, not only TanStack Start, and a manifest read with them is answered `private, no-store`.
- On a catch-all route, `init` or the route root answers init, `manifest` answers the manifest, and any other path is proxied with `proxy` on or answers `404`. SvelteKit used to answer other paths with init. TanStack Start now answers the route root with init.

`fetchCachedGvl` from `@c15t/core/server` now reads and fills the same process cache as the one from `@c15t/core`, instead of a separate one.

**Breaking.**

- `@c15t/nextjs/api` no longer exports `fetchCachedManifest`, `getSMaxAge` or `ManifestFetchResult`. Use `fetchCachedManifest` from `@c15t/core/server`. `manifestGET` no longer substitutes `public, s-maxage=300, stale-while-revalidate=86400` when the backend sends no `cache-control`, and no longer sends `x-c15t-next-revalidate`. Its configuration error now reads `@c15t/nextjs: pass backendURL or manifestURL.`
- In `@c15t/astro/api`, `resolveManifestInit` rejects when an IAB policy's vendor list cannot be loaded instead of returning `gvl: null`, and the `FetchGvl` callback receives `fetch` typed as `typeof globalThis.fetch`. The server render then leaves the policy to the browser.
- In `@c15t/svelte/kit`, a catch-all route answers `404` for any path other than `init`, `manifest` or the route root, unless `proxy` is on. It used to answer those paths with init. Migration: send init requests to `<route>/init` or the route root; c15t's own clients already do.

### Start `/init` from the HTML of Nuxt `ssr: false` pages

On a page Nuxt sends as a shell (`ssr: false` for the app or the route), the
module now writes a small inline script into the page head that calls the
backend's `/init` while the browser is still parsing the HTML. When the app's
JavaScript has loaded, the consent runtime uses that response instead of
sending its own request. Before, the request waited for the app's JavaScript
to download and run.

The script is added only when `manifest` is unset and no `consentSource`,
`customFetch` or `experiment` is configured. It carries the backend URL and
nothing from the request, so prerendered and cached shells can include it.
Server-rendered pages are unchanged.

The script takes `nuxt-security`'s per-request nonce, or the `nonce` option.
Set the new module option `initPrefetch: false` to turn it off, for example
when your Content Security Policy cannot allow it, or the route rule
`c15t: { initPrefetch: false }` to turn it off for some routes.

`buildPrefetchScript` from `@c15t/core` now works in server bundles built by
Nitro. Nitro rewrote `typeof window` inside the script's text, so the script
returned before it sent any request.

### One server-side consent resolution for every adapter

`resolveConsent` in Next.js, TanStack Start and SvelteKit, `loadConsent` and `c15tHandle` in SvelteKit, the Astro middleware and the Nuxt plugin now resolve a request's consent state through one function, `resolveRequestConsent` from `@c15t/core/server`. Each adapter keeps its own entry point and reads the request with its framework's API. The copies had drifted; every adapter now follows these rules:

- **What the backend receives.** A hosted `/init` request carries the resolved country, region, language and GPC signal, the `user-agent`, and the experiment arm while the visitor has no stored choice. Over `https` or to a loopback host it also carries the consent cookie (`cookieName` or `storageConfig.storageKey`) and any `forwardHeaders`. It never carries the rest of the cookie jar: Next.js and SvelteKit used to send every cookie the site owns. The visitor IP travels as `x-forwarded-for` only with `trustForwardedHeaders`; Next.js and SvelteKit used to copy the client's `x-forwarded-for`. `forwardHeaders` cannot name `cookie` or a `forwarded`/`x-forwarded-*` header. A manifest request carries nothing about the visitor unless you name headers or cookies for it.
- **Own routes.** A server render never fetches the app's own consent routes over the network: the routes an adapter mounts (TanStack Start `routePrefix`, `/api/c15t` by default; Astro's injected endpoints) or declares (Next.js `config.manifestURL` and `config.initURL`). It renders without a server decision and, in Next.js, says why in development. SvelteKit and Nuxt reach their own init route in-process through `event.fetch` and Nitro's local fetch, as before. Next.js mounts nothing under `/api/c15t`, so a `backendURL` of `/api/c15t` (a rewrite or a mounted backend) is still asked for `/init`. A hosted request to the app's own origin is marked; a render whose request carries the mark does not fetch its origin again, so a prefix that answers with a page cannot loop.
- **Next.js manifest source.** With `config` and a same-origin `config.manifestURL`, `resolveConsent` reads `${config.backendURL}/manifest` through the same process cache entry the manifest route uses, instead of fetching that route. When `config.backendURL` is the `/api/c15t` rewrite prefix, pass the handlers' upstream URL as `resolveConsent`'s `backendURL` too.
- **GPC.** Every adapter reads `x-c15t-gpc`, then `sec-gpc`, and leaves an absent signal `undefined`. SvelteKit read only `sec-gpc` and turned a missing header into `false`.
- **Budget.** `timeoutMs` means the same everywhere: `false` or `Infinity` waits for the upstream, and a value that is not a finite, non-negative number uses the 500 ms default. Astro and Nuxt turned `NaN` into no budget. `@c15t/svelte/server`'s `resolveConsent` now has the same 500 ms default; it had none.
- **Shared renders.** A prerendered or cached render reads no visitor facts, carries no stored records, clock, GPC signal or experiment arm, and makes no hosted or manifest request; offline mode still resolves. TanStack Start applies it while it prerenders and accepts `shared`. SvelteKit accepts `shared` on `c15tHandle` and `loadConsent`; pass SvelteKit's `building` flag. Astro (`isPrerendered`) and Nuxt (prerender and cache route rules) keep their rules.
- **Vendor list.** The full Global Vendor List is replaced by a reference whenever the browser can fetch it the same way: no custom `fetch`, and no cookie or private header on the request. The app's own init route reads no cookie, so SvelteKit and Nuxt in-process renders send none and keep the reference.

**Breaking.**

- `@c15t/nextjs/server` no longer exports `DEFAULT_FORWARD_HEADERS` (`x-forwarded-for` and `user-agent`), and there is no default list to extend. `resolveConsent` always sends `user-agent`, sends the visitor IP as `x-forwarded-for` only with `trustForwardedHeaders: true`, and adds the request headers you name in its `forwardHeaders` option. `onError` receives an error that names the URL, with the original failure as `cause`.
- `@c15t/astro/api` no longer exports `loadConsentManifest`, `resolveManifestInit`, `resolveSessionReportURL`, `ResolvedInitOutput` or `SessionReportTarget`; the server render uses `resolveRequestConsent`. The server render no longer sends the consent cookie over plain HTTP to a same-origin host that is not loopback.
- `@c15t/vue/runtime/manifest` no longer exports `C15T_TIMEOUT_HEADER`, `DEFAULT_NUXT_RESOLVE_TIMEOUT_MS` or `resolveNuxtTimeoutMs`. Use `CONSENT_ROUTE_TIMEOUT_HEADER` from `@c15t/core/server`. The Nuxt plugin keeps the resolved state in `useState('c15t:consent')` instead of a `useFetch` result under `c15t:init`. On a route rendered only in the browser (`ssr: false`), the plugin no longer holds the app's mount until `/init` answers: the app paints first and the runtime starts init once it mounts. The Nuxt client bundle drops `useFetch` and the vendor-list deferral code from the plugin (about 4.6 KB gzip of initial JavaScript in the benchmark app).
- In `@c15t/svelte/kit`, `C15tHandleOptions` is an interface with `shared`, and `loadConsent`'s `fetch` is used only for a backend on another origin; same-origin URLs always go through `event.fetch`.

## c15t@3.0.0-alpha.4 (alpha)

### Resolve Nuxt visitors in the browser on prerendered and cached routes

Nuxt pages that are prerendered, or cached by a `cache`, `swr`, `isr` or `prerender` route rule, no longer carry the consent records, location and request headers of the render that produced them. That HTML is served to every visitor, so it now renders without the banner, and the browser requests the visitor's policy and reads their stored choice after hydration. Before, the browser reused the build-time or first visitor's result and skipped its own policy request, and a visitor who rejected saw the banner again after a reload.

In the browser, a newer denial kept in localStorage now also applies on top of the records the server read from the request cookie, instead of being overwritten by them.

### Export the Astro dialog stylesheets

With `styles: false`, import the preference dialog's rules from `@c15t/astro/dialog.css` (`c15t/astro/dialog.css` in the umbrella package). The Svelte dialog also needs `@c15t/astro/primitives.css` (`c15t/astro/primitives.css`). You no longer need to install `@c15t/ui` to import `@c15t/ui/styles/dialog.css` and `@c15t/ui/styles/primitives.css`.

```css
@import 'c15t/astro/styles.css';
@import 'c15t/astro/dialog.css';
@import 'c15t/astro/primitives.css';
```

### Load new copy when the Vue consent language changes

Assigning a new language to `useConsentLanguage()` now runs init again, so the banner and dialog switch to that language without a separate `commands.init()` call. Assigning the current language does nothing. The Nuxt `ConsentRoot` now takes the same `language` prop as the Vue `ConsentRoot`.

A `country`, `language` or `region` prop on the Vue or Nuxt `ConsentRoot` no longer runs an extra init on every page load. A prop equal to what the server already resolved, such as the prefetched language, runs none; a different value is sent with the startup init, or with one init when the server prefetched. Init no longer runs during server rendering. Changing a prop after the page has loaded still runs init once.

### Start the banner's entry from the stylesheet, and keep the collator off the init path

Canonical sets and fingerprint keys were sorted with
`String.prototype.localeCompare`, whose first call initialises the ICU
collator on the main thread before the banner can show. They now use a
comparator that applies the same root-collation order to printable ASCII
directly and only falls back to the collator for other strings, so every
fingerprint stays byte-identical.

Every framework also started the banner's entry transition its own way: the
script tag and Svelte inserted the hidden state, forced a layout and flipped
the class; React rendered hidden and flipped after a timer; Vue handed the
flip to `Transition`; Astro's prerendered banner did not animate at all.
`@c15t/ui` now carries the entry as `@starting-style` states, the
`bannerEntering`, `overlayEntering`, `dialogEntering` and `contentEntering`
classes, and each framework renders the banner in its visible state with the
entering class. The transition runs from the first frame with no hidden
render or layout read, and it runs the same way whether the banner arrives
from the server or the client. Astro's prerendered banner now fades in at
first paint like the others. Browsers without `@starting-style` show the
banner in place; the script tag keeps its class flip for them.

### Count each experiment arm's visitors through `/init`

The backend now learns which arm a visitor runs before they choose, so a dashboard can compute an opt-in rate per arm without any analytics setup. While a visitor has no stored choice, `/init` carries their arm in an `x-c15t-experiment: <id>=<arm>` header, and the backend adds `experiment: { id, arm }` to that request's session report. Manifest-mode renders and init routes put it on the report they send to `POST /sessions`. A visitor who already chose is not counted, because they are not shown the banner.

On a server-rendered page, pass the experiment with the visitor's arm to `resolveConsent({ experiment: { ...bannerShape, arm } })` in `c15t/next`, `@c15t/tanstack-start` and `@c15t/svelte`. The server sends only `{ id, arm }` to the backend, and the returned state carries the experiment to the client, so the provider needs no `experiment` option of its own. A streamed (unawaited) state arrives after the provider mounts, so pass the experiment to the client too; the provider warns in development when you forget. Astro and Nuxt send the arm they rendered on their own. `@c15t/schema` exports `CONSENT_EXPERIMENT_HEADER`, `formatExperimentHeader` and `parseExperimentHeader`, and the session report schema gains an optional `experiment`.

The `choice:recorded` kernel event and `onChoiceRecorded` payload now include `uiSource` and `consentAction`, and `onSurfaceShown` and `onChoiceRecorded` carry the arm, so forwarding experiment events to GTM, PostHog or any other tool is one callback.

Opt-out experiments are measurable too. The `notice:dismissed` kernel event now carries `surface`, `timeToDecisionMs` and `experiment`. The surface is the snapshot's `activeUI`, so a programmatic `dismissNotice()` with no prompt open reports `surface: 'none'` and no timing, the same as a programmatic `save()`.

Dev-tools show the assigned experiment arm and the first impression time of each surface on the Policy tab.

### A/B test banner presentation with any flag provider

Add an `experiment` option for A/B tests on banner and preferences presentation. Your `presentation` is the `control` arm; `arms` lists what every other arm changes. Pass the `arm` your feature flag resolved (Vercel Flags, PostHog, LaunchDarkly, GrowthBook, Statsig), or a `split` such as `{ control: 60, wall: 40 }` for c15t to pick. `defineExperiment()` infers the arm names, so a misspelled `arm` or `split` key is a type error.

```ts
experiment: {
  id: 'banner-shape',
  arms: { wall: { prompt: { variant: 'wall' } } },
  arm: flagValue, // or split: { control: 60, wall: 40 }
}
```

The arm is merged over `presentation` and exposed as `snapshot.experiment` (React and Vue `useExperiment()`, Svelte `state.experiment`, browser `client.presentation`). It rides on `surface:shown` and `choice:recorded` and is saved with the choice as `metadata.experiment`, but only once the banner has shown it in the current page. A returning visitor who changes their choice from a footer link is not counted toward an arm they never saw.

When c15t picks the arm, it does so when the page starts, before `/init`, and holds the banner until the arm is checked, so the visitor never sees one banner swap for another; on a server-rendered page the banner appears after hydration. The arm is stored as `{ id, arm }` under `c15t-experiment-v1` once the banner has shown it. Nothing is stored for a visitor who is never prompted or for an arm from your flag, and no identifier is stored.

Arm validation loads as its own chunk, only when `experiment` is set, so a site without an experiment ships none of it. It is also exported from `c15t/experiment`, where `validateExperiment()` lets a test fail a build on a rejected arm.

Nothing in the experiment throws into the page. An undeclared `arm` or an unusable `split` logs an error and runs no experiment. An arm that trips a presentation diagnostic under the visitor's policy is not shown to that visitor, who sees `control` and is not counted, unless `acknowledgeDiagnostics: true`, which is recorded with the arm.

`@c15t/astro` resolves the arm on the server: per request through `consentMiddleware({ experimentArm })` from `@c15t/astro/middleware` with `middleware: false`, or one fixed `arm`. Arms vary presentation and theme, not copy.

An arm can also carry `theme` overrides (`arms: { bold: { theme: { colors: { primary: '#0a0a0a' } } } }`), merged one token group deep over the host `theme`. Read the merged theme with React `useResolvedTheme()`, Vue `useResolvedTheme(theme)`, Svelte `getConsentManager().theme` and browser `client.theme`. In React, render its tokens with `<ConsentTheme theme={useResolvedTheme()} />`.

### Fetch a `manifestURL` in the browser from the plain Vue plugin

With the plain Vue plugin, setting `manifestURL` without `manifest` now selects client manifest mode: the browser fetches that manifest and resolves the policy itself. Before, it selected server mode and called `/api/c15t/init`, a route only the Nuxt module registers. The Nuxt module is unchanged: its `manifest` option defaults to `false`, so a `manifestURL` there needs `manifest: 'server'` or `manifest: 'client'` as well.

### Load the Tailwind 3 PostCSS plugin from the package you installed

Every package that publishes a c15t stylesheet now exports the Tailwind 3 PostCSS plugin as `<package>/postcss-tailwind3`, so you no longer install `@c15t/ui` just to list it:

- `c15t/postcss-tailwind3` for apps that install `c15t` (React, Next.js, TanStack Start, Vue, Nuxt and Astro)
- `@c15t/svelte/postcss-tailwind3` for Svelte and SvelteKit
- `@c15t/browser/postcss-tailwind3` for script tag pages that style the light DOM
- `@c15t/react/postcss-tailwind3`, `@c15t/nextjs/postcss-tailwind3`, `@c15t/tanstack-start/postcss-tailwind3`, `@c15t/vue/postcss-tailwind3` and `@c15t/astro/postcss-tailwind3` for apps that install an adapter directly

```js title="postcss.config.mjs"
export default {
	plugins: {
		'c15t/postcss-tailwind3': {},
		tailwindcss: {},
		autoprefixer: {},
	},
};
```

Each one re-exports `@c15t/ui/postcss-tailwind3`, so configs that already list that name keep working. The plugin must still come before `tailwindcss`.

`c15t setup` now adds the plugin from the package it installs, `c15t/postcss-tailwind3`, or `@c15t/react/postcss-tailwind3` and `@c15t/nextjs/postcss-tailwind3` in apps that installed those directly, and no longer installs `@c15t/ui` for Tailwind 3. It leaves a config alone when any c15t `postcss-tailwind3` entry, including `@c15t/ui/postcss-tailwind3`, already runs before `tailwindcss`.

### Show the Vue dialog trigger after the prompt under `after-consent`

`triggerShowWhen: 'after-consent'`, the default, now hides the floating `ConsentDialogTrigger` until the policy owes no prompt: a choice is saved or a notice is dismissed. Before, only `'never'` was checked, so the trigger showed next to an unanswered banner. Set `triggerShowWhen: 'always'` to keep it visible while the banner is open.

### Rename the remaining `frame` names to `consentGate`

**Breaking.** `ConsentGate` was called `Frame`, and several names still said so. They now say `consentGate`:

- The translations section `frame` is now `consentGate` (`consentGate.title`, `consentGate.actionButton`, `consentGate.policyBlocked`, `consentGate.loading` and `consentGate.error`) in every bundled language, in `CompleteTranslations` and `Translations`, in the `/init` response schema, in `@c15t/backend` responses and in the React Native translation types. `FrameTranslations` is now `ConsentGateTranslations`, and the old name stays as a deprecated alias.
- The stylesheet `@c15t/ui/styles/components/frame` is now `@c15t/ui/styles/components/consent-gate`, and its custom properties are `--consent-gate-*` instead of `--frame-*`.
- The placeholder's test ids are `consent-gate-placeholder` and `consent-gate-button` instead of `frame-placeholder` and `frame-open-dialog`. Its title now has `consent-gate-title`.

Copy under the old key still works. When custom translations, `i18n.messages`, stored copy or an older backend's `/init` response has `frame`, c15t reads it as `consentGate`, with `consentGate` winning key by key when both are set, and logs a warning once outside production. `@c15t/translations` exports the conversion as `migrateLegacyTranslationKeys`. The `frame` stylesheet subpaths stay as deprecated aliases of `consent-gate` for this alpha.

`theme.slots` has a `consentGate` family for the placeholder: `consentGate` for the card, `consentGateTitle` and `consentGateButton`. React, Next.js, TanStack Start, Vue and Svelte apply them. React and Vue also take the same parts as `components['consent-gate'].root`, `.title` and `.button`, and `components` wins where both set an attribute. `consentGateButton` applies on top of `buttonPrimary`.

### Report banner impressions and time to decision

Report banner and dialog impressions, not only choices. The kernel emits a `surface:shown` event when the banner or the dialog becomes visible and records the first impression time of each surface in `snapshot.surfaceShownAt`, so a late subscriber can still read it. Provider callbacks gain `onSurfaceShown` (React and Vue/Nuxt `callbacks.onSurfaceShown`); `@c15t/browser` dispatches `c15t:surfaceShown`; dev-tools log the event. A recorded choice now carries `timeToDecisionMs` (impression to action) on the `choice:recorded` event, on `onChoiceRecorded`, and on the saved consent as `metadata.timeToDecisionMs`. `kernel.commands.save()` accepts a `uiSource` override, and the React `uiSource` prop now reaches the save payload, so `ConsentWidget` saves are attributed to `widget` instead of the active banner. The never-fired `onBannerFetched` callback and `OnBannerFetchedPayload` type are removed.

`kernel.markLive()` is public: an adapter that renders from a server-resolved prefetch and never calls `init()` calls it after hydration, so the server-rendered banner still counts as an impression. The core runtime, the React provider (and so Next.js and TanStack Start) and the Vue runtime (and so Nuxt) do this; before, an SSR page with a resolved prefetch never emitted `surface:shown`.

`consentAction` on a saved choice now stays `all` or `necessary` when the host displays only a subset of the policy scope (`consentCategories`). It names the action the visitor took; `confirmed` names the categories it covered. Before, a narrowed accept-all was recorded as `custom`.

A choice saved while a `notice` prompt is owed now records the notice dismissal with it. Before, a visitor who opened the preference center from an opt-out notice and rejected was shown the notice again.

### One tenant setting, refused when it is unsafe, and recovery for visitors whose subject ID another tenant holds

A self-hosted backend now names its tenant in one place: the instance's `tenantId`. `manifest.tenantId` is removed from the backend configuration. It never scoped a database query, but it did scope policy snapshot tokens when the instance had no `tenantId`, so a config that set only that one issued tokens for a tenant while writing every consent with a null tenant. Built manifests no longer carry it. `ConsentManifest.tenantId` stays on the wire type for other manifest producers.

`c15tInstance` and `createApp` check the tenant when the instance is built. They throw when `tenantId` is empty, padded with whitespace or not a string (a `null` from a JavaScript config used to scope every query to `tenantId = NULL`, which matches nothing), and when the config still sets `manifest.tenantId`, rather than ignoring it. The new `requireTenantId: true` option makes a missing `tenantId` throw too. Set it on every instance that shares a database with other tenants. Without it, an instance whose tenant lookup returned `undefined` starts in the single-tenant scope and writes consents with a null tenant, which the tenant that owns them never reads.

Subject IDs are chosen by the browser and are unique across the whole database. A save naming a subject ID that another tenant holds was answered `400 CONFLICT`, on every save, with no way for the visitor to recover. It is now `409 SUBJECT_CONFLICT`. `@c15t/core` responds by giving the visitor a new subject ID, moving any queued saves to it, and sending the choice once more. Every open tab moves to the same new ID. A consent recorded again with different receipts, purposes or vendor grants is now `409 CONFLICT` instead of `400`. The hosted and manifest transports treat both as permanent refusals, so the kernel no longer replays them from its queue.

### Migration

- Remove `tenantId` from the backend's `manifest` block and set it on the instance. If the instance already sets the same value, delete the manifest one. If it set only `manifest.tenantId`, the instance has been writing rows with a null tenant: setting `tenantId` scopes it to that tenant, and those rows stop appearing in its reads.
- Code that matched `400` with `cause.code: 'CONFLICT'` from `POST /subjects` should expect `409`, and `SUBJECT_CONFLICT` for a subject ID held by another tenant. `PUT /legal-documents` conflicts are still `400 CONFLICT`.
- A manifest built from a config that set `tenantId` gets a new `revision`, so cached manifests refresh once.

### Accept `colorScheme: null` in Astro

The integration's `colorScheme` accepts `null` with the same meaning as `'none'`: c15t neither sets nor clears `c15t-dark` on `<html>`. `null` is the value the React, Vue and Svelte providers use for this, so a shared config works in all of them. The default stays `'system'`.

### Type `nonce`, `iframeBlocker`, `storageConfig`, `domain` and `app.config.ts` for Nuxt

The Nuxt module options now accept `nonce`, `iframeBlocker`, `storageConfig` and `domain`, which the runtime already read. The `c15t` key of `app.config.ts` is now typed, including when the module is registered as `c15t/vue`, and accepts `networkBlocker.onRequestBlocked`. Module options pass through JSON and cannot hold that callback, so set it in `app.config.ts`.

### Index experiment attribution and summarise choices per arm

Summarise banner experiments from the backend. Migration `6-experiment-attribution` adds `experimentId`, `experimentArm` and `timeToDecisionMs` columns to `consent`, indexed on `(tenantId, experimentId, experimentArm)`, and `POST /subjects` fills them from `metadata.experiment` and `metadata.timeToDecisionMs` while leaving `metadata` untouched. Values over 128 characters or malformed are dropped rather than failing the save. `GET /experiments/:id/summary` (API key) returns `arms: [{ arm, choices, byAction, bySurface, medianTimeToDecisionMs }]`, choices per arm split by stored `consentAction` (`byAction` always carries `accept_all`, `reject_all`, `opt_out`, `custom` and `unknown`) and `uiSource`, with the median time to decision, filtered by `from`, `to` and `domain`; the response is validated against the new `experimentSummaryOutputSchema` in `@c15t/schema`, and `@c15t/node-sdk` exposes it as `client.experiments.summary(id, { from, to, domain })`. The summary counts choices; the visitors each arm was owed to arrive on the session reports `/init` produces, so an opt-in rate divides the two.

### Add `disableAnimation` to Astro

The integration accepts `disableAnimation`. It skips the banner's entry animation, in the server markup and in a banner the browser renders, and the dialog islands' enter and exit animations. `<ConsentBanner />`, `<IABConsentBanner />`, `<ConsentDialog />` and `<IABConsentDialog />` take the same prop to override it for one surface.

```astro
<ConsentBanner disableAnimation />
```

Left unset, animations play, and the stylesheet stops them for visitors who ask for reduced motion, as before.

### Add `colorScheme` and dark theme tokens to Vue and Nuxt

The Vue plugin and the Nuxt module accept `colorScheme`, with the same values as the React and Svelte providers. `'light'` and `'dark'` force a scheme, `'system'` follows `prefers-color-scheme` as the visitor changes it, and leaving it unset mirrors a `dark` class on `<html>` into `c15t-dark`. `null` leaves `c15t-dark` to the site. Before, Vue never set `c15t-dark`, so the dark component styles only applied when the site set that class itself.

Both also accept `theme`, the same token object `@c15t/react` takes, including `theme.dark`. Its tokens go into the `<style id="c15t-css-vars">` element with `tokens`, and win where both set a variable. Vue still reads slot overrides from `components`.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
	c15t: {
		colorScheme: 'system',
		theme: { dark: { primary: '#7fd1a8' } },
	},
	modules: ['@c15t/vue'],
});
```

Nuxt renders an inline script in `<head>` that sets `c15t-dark` for `'dark'` and `'system'`, with the configured `nonce`, so a dark visitor's first paint is already dark. `generateTokensCSS()` takes the scheme and theme as a second argument for plain Vue server rendering. A plugin given a borrowed `runtime` leaves the class to the host, as it does the tokens.

### Translate the Vue preferences link and match the consent gate placeholder to React

`ConsentPreferencesLink` now defaults to the `consentManagerDialog.title` translation instead of the fixed text "Privacy settings".

The `ConsentGate` placeholder was the fixed text "Content requires permission.". It now renders the same placeholder as the React and Svelte gates: the `consentGate.title` text with the category name and a button labelled with `consentGate.actionButton` that opens the preference center. The gate also adds its category to the categories the preference center lists. Under a strict policy that leaves the category out, the placeholder shows `consentGate.policyBlocked` and no button.

Both components use the visitor's language once init has delivered copy, and English until then. Slot content, including the gate's `placeholder` slot, still replaces the defaults.

### Pass the backend URL to the server helpers

**Breaking.** The server helpers no longer read c15t configuration from environment variables. Pass `backendURL` or `manifestURL` to them. If you keep the URL in an environment variable, read it in your own code and pass the value.

| Helper | No longer read |
| --- | --- |
| `createNextConsentRouteHandlers`, `createPagesApiHandlers` (`c15t/next/api`, `c15t/next/pages`) | `C15T_BACKEND_URL`, `NEXT_PUBLIC_C15T_BACKEND_URL`, `C15T_MANIFEST_URL`, `C15T_MANIFEST_REVALIDATE_SECONDS` |
| `createConsentServerRoute` (`c15t/tanstack-start/api`) | `C15T_BACKEND_URL`, `VITE_C15T_BACKEND_URL`, `C15T_MANIFEST_URL` |
| `createSvelteKitConsentRouteHandlers` (`@c15t/svelte/kit`) | `C15T_BACKEND_URL`, `C15T_MANIFEST_URL` |
| `manifest()` mode and its injected routes (`c15t/astro`) | `C15T_BACKEND_URL`, `PUBLIC_C15T_BACKEND_URL`, `C15T_MANIFEST_URL` |

These helpers now take a required options argument. Without `backendURL` or `manifestURL`, each request throws, for example `@c15t/nextjs/api: pass backendURL or manifestURL.` Astro's `manifest()` without a `backendURL` or an inline `manifest` fails when `astro.config` loads. `manifestRevalidateSeconds` defaults to `300`.

The ready-made handlers built from environment variables are removed: `GET` and `manifestGET` from `c15t/next/api` and `@c15t/nextjs/api`, and `GET`, `manifestGET` and `initGET` from `c15t/tanstack-start/api` and `@c15t/tanstack-start/api`.

Before:

```ts title="app/api/c15t/manifest/route.ts"
export { manifestGET as GET } from 'c15t/next/api';
```

After:

```ts title="app/api/c15t/manifest/route.ts"
import { createNextConsentRouteHandlers } from 'c15t/next/api';

import { consentConfig } from '@/c15t.config';

export const { manifestGET: GET } =
	createNextConsentRouteHandlers(consentConfig);
```

The init route takes `GET` from the same call. You can pass options instead of a config, for example `createNextConsentRouteHandlers({ backendURL: 'https://your-project.inth.app' })`.

`c15t setup` writes the chosen backend URL into the generated components, `c15t.config.ts` and the `next.config` rewrite as a string. Quotes and backslashes in the URL are escaped, so they no longer break the generated `next.config`. It no longer writes `.env.local` or `.env.example`, no longer asks whether to store the URL in a `.env` file, and no longer accepts `--env`.

### Support IAB TCF 2.4

c15t now follows TCF 2.4 and TCF Policies v5.0.b. Existing TC strings stay valid.

- The IAB preference centre shows Features in their own section with the IAB standard text and no controls. Special Purposes stay locked.
- `__tcfapi` TC data includes `vendor.disclosedVendors`.
- `isServiceSpecific` is deprecated. TC strings always set IsServiceSpecific=1.
- Vendors that declare only Special Purposes no longer get a legitimate interest bit.
- GVL schemas keep unknown fields, so `standardTexts` survives the backend cache.

### Migration

Headless IAB UIs: `resolveIABDialogDisplayModel` now returns Features in `featureRows` instead of `essentialRows`. Render them without a control, under `featuresStandardText` or your `features.description` translation when it is `null`.

### Support nonce- and hash-based Content Security Policies in Astro

Set `Astro.locals.c15t.nonce` from your own middleware, which runs after c15t's, and every inline `<script>` and `<style>` the c15t components render carries it. In the browser, the runtime puts the same nonce on the scripts its loader injects, on gated `type="text/plain"` scripts it activates, and on the dialog stylesheets it links.

```ts
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
	const nonce = crypto.randomUUID();
	if (context.locals.c15t) {
		context.locals.c15t.nonce = nonce;
	}
	const response = await next();
	response.headers.set(
		'content-security-policy',
		`script-src 'self' 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}'`
	);
	return response;
});
```

With Astro's `<ClientRouter />` and a nonce generated per request, each page the router swaps in arrives with a new nonce, while the browser keeps enforcing the first page's policy. Before the swap, the runtime gives c15t's own inline scripts and theme stylesheet on the new page, and its gated `data-c15t-category` tags, the first page's nonce when they carry the incoming one, so c15t's inline code still runs and the gated tags still pass the nonce check. Other elements keep their nonce. c15t's inline scripts now carry a `data-c15t-inline` attribute for this. If the incoming page has config scripts with different nonces, as when markup injected into it plants a second one, the runtime changes nothing on that page and logs a warning.

`<ConsentBannerDeferred />` passes the page's nonce to its server island, because the page's policy is the one that applies to the markup the island inserts. `<ConsentBanner />` takes the same value as a `nonce` prop. Astro's own island loader is an inline script without a nonce, so a nonce-only policy still blocks the island until the policy allows that script too.

With Astro's own CSP turned on (`security.csp`, or `experimental.csp` in Astro 5), the integration adds the hashes of the colour-scheme script, the banner reveal scripts, the theme stylesheet and inline `scripts` entries to it. With an `experiment`, it hashes the theme stylesheet of every arm, since an arm's `theme` changes the stylesheet the banner renders. You no longer need `'unsafe-inline'`.

Inline `scripts` from a `clientEntrypoint` module are the one exception: that module only runs in the browser, so the integration cannot hash them when Astro loads the config. With Astro's CSP on, the browser now hashes each of them and logs a console error naming the script and the hash the policy lacks. Add that hash to `scriptDirective.hashes` in the `csp` config, or move a script that has no callbacks into the integration's `scripts` option, which c15t hashes for you.

The per-visitor boot payload now renders as a `<script type="application/json" data-c15t-config>` data block, which a policy does not need to allow, instead of a script that assigns `window.__c15tAstroConfig`. `buildConfigJSON()` from `@c15t/astro/server` builds it. A page that still sets `window.__c15tAstroConfig` with `buildConfigScript()` keeps working, and the runtime reads the nonce from that script when it has one.

Put the page's nonce on your own gated tags too: `<script is:inline type="text/plain" data-c15t-category="measurement" nonce={Astro.locals.c15t.nonce}>`. c15t activates a gated tag by creating a new `<script>`, and a policy with `'strict-dynamic'` runs a script that a trusted script creates without checking its nonce. So a tag injected into the page through an HTML-injection hole would run as soon as its category was granted. When the page has a nonce, the runtime activates only tags carrying it, with that nonce. It skips the others, marks them `data-c15t-activated="untrusted"` and logs a warning. Pages without a nonce behave as before.

### Inspect consent from a c15t tab in Nuxt DevTools

In development, the Nuxt module adds a c15t tab to Nuxt DevTools. The tab shows the DevTools panels for the app's consent kernel, including events and consent actions, and follows the DevTools light or dark theme. Production builds don't register the tab. Set `devtools: false` in the module options to turn it off.

`c15t/vue/devtools` and `@c15t/vue/devtools` now export `ConsentDevToolsPanel`, which fills its parent element instead of floating over the page. `createDevTools` accepts `embedded: true` for the same layout, and can render into a same-origin iframe while it inspects the page that owns the kernel.

Embedded panels, including the TanStack Devtools plugin from `c15t/react/devtools`, no longer show their own c15t header, because the host already names the panel.

### Load only the dialog link from its subpath

`@c15t/nextjs/components/consent-dialog-link`, `@c15t/tanstack-start/components/consent-dialog-link` and their `c15t/next` and `c15t/tanstack-start` equivalents now export only `ConsentDialogLink`. They pointed at the whole adapter entry, so importing the link pulled in the rest of the adapter.

### Resolve unknown locations on static pages with the manifest's own policy

`createStaticConsentResolver` from `@c15t/tanstack-start/static` now starts a visitor with no known location on the manifest's unknown-location policy (its `fallback` pack, else its `default` pack), as `@c15t/nextjs/static` already did and as server rendering does when location headers are missing. It previously picked the strictest pack in the manifest and applied it to everyone, including packs scoped to other countries. A manifest with no fallback or default pack now resolves to a failed `insufficient-inputs` result, and the client applies its safe fallback.

Geo data that isn't a non-empty string, such as a numeric `country` or a blank `regionCode` from the geo endpoint, now counts as an unknown location. It previously reached the policy resolver and could end up in `location.countryCode`. String values are trimmed.

The static resolver now lives in `@c15t/core/static` (also available as `c15t/static`), and both framework `static` entries re-export it. `resolveStrictestDefaultInit` is renamed to `resolveUnknownLocationInit`. The old name still works in `@c15t/nextjs/static` and `@c15t/tanstack-start/static` and is marked deprecated.

### Accept `disableAnimation` on the Vue banners and dialogs

`consent-banner.vue`, `consent-manager.vue` and the IAB banner and dialog take a `disableAnimation` prop that overrides the config's `disableAnimation` for that surface, as the React components do. Left unset, they follow the config.

### Ship a c15t skill and the v3 guides in every package

Each package now ships a `SKILL.md` next to `AGENTS.md`, telling coding agents
how to pick a setup, which rules to follow and how to verify consent, with
links into the bundled Markdown. `@c15t/core`, `@c15t/react`, `@c15t/nextjs`,
`@c15t/scripts`, `@c15t/browser`, `@c15t/integrations` and `@c15t/cli` publish
it for the first time.

The bundled docs follow the rewritten v3 guides: concept pages, a setup
chooser, a full page set for every framework, and a new HTML guide for the
script tag in `@c15t/browser`. `@c15t/iab` points its homepage and README at
the new IAB page.

### An undeclared vendor reads as not allowed

Breaking change: reading vendor consent for an id that no `vendors` entry, script slug or backend vendor list declares now returns `false`. Before, React's `useVendorAllowed`, Astro's `client.isVendorAllowed` and `@c15t/browser`'s `isVendorAllowed` returned `true` for such an id without checking any category, so a typo or a missing declaration read as allowed before the visitor consented. In development, c15t logs one warning per undeclared id that names the missing declaration. Declare every vendor you read, for example `vendors: [{ id: 'youtube', category: 'measurement', ... }]`.

The rule lives in one helper, `isVendorAllowed(snapshot, vendorId, now?)`, exported from `c15t` and `@c15t/core`. A declared vendor keeps its behaviour: it is allowed when its category condition passes and, outside an IAB policy, the visitor has not switched it off.

Vue gains `useVendorAllowed(vendorId)`, which returns a computed boolean and is auto-imported in Nuxt. The Svelte consent manager from `getConsentManager()` gains `isVendorAllowed(vendorId)`.

Scripts, iframes and network rules that carry an undeclared `vendor` slug are gated as before: they follow their category.

### Apply Vue theme tokens before the first paint

The Nuxt module now adds the `tokens` CSS variables to the page head from its plugin, so server-rendered and prerendered HTML carries them on every page, with the configured `nonce`. The plain Vue plugin adds them to `document.head` when it is installed, before the first render, and removes them when the last app using them unmounts. A second app on the same page reuses the element, and a `<style id="c15t-css-vars">` rendered by the server is left in place. Before, the Vue `ConsentRoot` set them only after mount, so the first paint used the defaults, and surfaces composed without a `ConsentRoot` never got them.

For plain Vue apps rendered on the server, `generateTokensCSS()` from `@c15t/vue/vue-plugin` returns the same CSS to put in a `<style id="c15t-css-vars">` element in the server HTML.

### Label Astro legal links and show them in the preference dialog

A legal link with no `label` in `legalLinks` now reads as the translated name for its type, such as "Privacy Policy" or "Datenschutzerklärung", instead of the raw key `privacyPolicy`. The React, Vue and Svelte banners already did this.

`<ConsentDialog />` takes a `legalLinks` prop with the same list `<ConsentBanner legalLinks>` takes, and passes it to the Svelte, React or Vue dialog island. Before, the Astro preference dialog never showed legal links.

```astro
<ConsentDialog legalLinks={['privacyPolicy', 'cookiePolicy']} />
```

## c15t@3.0.0-alpha.3 (alpha)

### Encode and enforce IAB publisher restrictions

Configure TCF publisher restrictions with `publisherRestrictions` on `createIAB`, `IABProvider`, the runtime's `iab` options or the Astro integration's `iab` options. c15t writes them into the TC string's `PubRestrictions` section, decodes them from stored strings, and reports them through `__tcfapi('getTCData')` as `publisher.restrictions`. Previously that map was always empty and configured restrictions were not encoded.

Consent-gated scripts, network rules and iframes with a `vendorId` now apply the confirmed restrictions: type 0 blocks the purpose, type 1 requires consent and type 2 requires legitimate interest for purposes the vendor list marks as flexible. Accept all grants the vendor signal a restriction needs. Legitimate interest a restriction introduces applies until the visitor objects, so Save Settings encodes it as allowed, matching what the preference centres show.

The React, Vue, Svelte and `@c15t/browser/iab` preference centres list each vendor under the legal basis the restrictions leave it, so a vendor moved to legitimate interest gets an objection control instead of a consent toggle. A purpose whose vendors all use legitimate interest shows no consent switch, only the objection, and display-model rows report this as `hasConsentBasis`. Such a purpose no longer decides its c15t category, so a granular save no longer records a denial that blocks its legitimate-interest vendors; legitimate interest never grants a category on its own. Custom UIs can use `applyPublisherRestrictionsToGVL` from `@c15t/iab/headless` or pass `publisherRestrictions` to `processGVLForDialog`.

IAB gates no longer let a refused c15t category block a target that uses only legitimate interest after publisher restrictions. Such a target needs no consent under TCF, so its purpose and vendor legitimate interest signals, and the visitor's objection, decide. Previously every restriction on a referenced category blocked IAB targets; GPC, opt-out directives and strict scope still do, and the refused category still blocks scripts that name only the category or declare a consent purpose.

Unsupported restrictions throw `PublisherRestrictionError` instead of being dropped. This covers reserved type 3, vendors or purposes missing from the vendor list, legitimate interest for purposes 1 and 3 to 6, basis changes on purposes the vendor does not declare as flexible, conflicting types for one vendor, and restrictions in a string that is not service-specific. `whenReady()`, `save()` and `generateTCString()` reject, and no TC string is written. Retrying `whenReady()` does not fetch another vendor list. With an explicit `gvl`, the error lasts for the handle and saving keeps failing even if the kernel later holds a different list; a CMP following the kernel's list checks a replacement list again. When a replacement vendor list makes a restriction unsupported, the TC authority confirmed under the previous list is cleared. Whenever the CMP withdraws its own authority, including on expiry, it also removes the `euconsent-v2` cookie and localStorage entry. A stored TC string whose restrictions differ from the configuration is not restored; the banner opens again for a returning visitor and closes once they save, IAB gates stay denied until then, and the superseded `euconsent-v2` cookie and localStorage entry are removed. Decoding a string written under TCF policy version 2 or 3 accepts legitimate interest required for purposes 3 to 6, which those versions allowed.

### Keep open tabs in step with stored consent

A choice saved in one tab now reaches the other open tabs on the same origin
without a reload. Before, a tab kept a grant after another tab stored a denial,
and neither `kernel.refresh()` nor `runtime.reinit()` read storage again.

Browser persistence reads stored records again when another tab on the same
origin changes a c15t localStorage key, when the page becomes visible and when
the window regains focus. A tab on another subdomain that shares the consent
cookie gets no `storage` event and catches up on its next focus or visibility
change, and so does every tab when localStorage is unavailable and only the
cookie is stored. Category decisions merge per category, keeping the newer decision for
each, and privacy directives merge as a union. A stored notice or vendor record
replaces the one in memory unless it is older. A record removed from storage is
cleared, so the active policy decides again. Blocked storage or bytes that do
not decode change nothing. Reconnecting does not read storage.

Queued writes follow the same rules. A tab lands its own pending write before it
reads, a choice write stores the per-category merge with what storage holds, a
directive write keeps every stored directive, and the rewrite that adds a
server subject id no longer recreates records another tab cleared. When two
tabs act in the same millisecond, the record stored first wins in both. A
tab that opened before another stored a subject joins the stored subject
unless it identified a different user; a subject id the server resolved is
kept unless a strictly newer stored choice carries another one. Only a
record this tab saw in storage is cleared when it disappears, so a choice
seeded while storage was blocked survives storage becoming readable.

Under an IAB policy, `@c15t/iab` loads the TC string another tab stored once
its choice is reconciled, with its purpose, vendor and special-feature
selections, so `__tcfapi` and the preference controls no longer show the
previous choice. Selections changed in this tab without saving are kept. A
TC string that grants any purpose of a category denied after it was saved
is withdrawn and not restored on the next page load; a partial purpose
selection saved through IAB keeps its TC string. A TC string confirmed before
the reconciled choice's newest decision, such as after a save on a sibling
subdomain that shares the consent cookie, is withdrawn as well, since the TC
string and its receipt belong to one origin. A newer receipt replaces the held
one even when the TC string is identical.

Clearing records now stores the clear epoch, the time of the clear, under
`c15t-epoch` in localStorage and a cookie of the same name, and clearing never
removes it. Every consent record written afterwards records its epoch too.
Decisions confirmed before the epoch are void everywhere: a tab that reconciles
after another tab cleared and saved again drops its pre-clear decisions, a tab
that missed the clear cannot write them back, and browser hydration and server
reads (`readStoredRecordsFromCookieHeader`) ignore them. A decision in the
clearing millisecond counts only from a tab that had seen the clear. Each clear
moves the epoch forward even after the clock went back, and an epoch up to an
hour ahead of the clock is kept. Records from before any clear, including v2
and legacy records, read as epoch 0 and are unaffected; a corrupt epoch also
reads as 0, and a record whose epoch field is corrupt is kept.

The consent cookie stays authoritative, but a denial in its localStorage copy
that is newer than the cookie's decision is now applied on top of it, so a
dropped cookie write no longer keeps an older grant in force. Copies written
under different clear epochs are cut to the later epoch first, and the
subject comes from the later copy. Privacy directives from both copies of the
privacy record apply, a newer local vendor list adds denials without lifting
any (a vendor copy from before the last clear is ignored), and the newer notice
dismissal applies. A newer local
grant is still not applied.

This changes the stored format: after a clear, the consent cookie gains
`&e=<time>` (16 bytes) and the localStorage record an `epoch` field (22 bytes).
Visitors who never cleared store what they did before. Older c15t builds reject
both the cookie and the localStorage record once they carry the epoch and treat
the visitor as undecided, so under an opt-out policy they grant optional
categories by default until a new choice is saved. Deploy the new build to every
page of the site before visitors can clear their records.

When two tabs write at the same moment and one write drops the other tab's
category or directive, the tab that lost it writes it back on its next
reconciliation, including directives it kept from storage in its own write.
Under an IAB policy, a TC string that grants a category a
reconciled denial covers is withdrawn before any `__tcfapi` listener is
notified, and one that predates another tab's newer choice is held back until
this tab reads that tab's receipt, so a revoked vendor is never advertised
again. A tab reloads the TC string when another tab stores a new receipt, which
covers a save in the same millisecond or one that changed only vendors, and
stops publishing the held one until the reload decides. Two receipts from the
same millisecond settle on the more restrictive one, so a revoked vendor is
never advertised again; when each grants something the other denies, the
stored receipt is removed and neither is published until the next save. When
another tab removes the receipt or clears localStorage, the held TC string is
withdrawn, and a receipt still being decoded is not installed. localStorage
has no conditional removal, so the removal after a tie can still delete a
receipt another tab stored a moment earlier; every tab then withholds its TC
string until the next save.

A page seeded from a server's cookie read applies newer denials and privacy
directives that reached only localStorage, and a local denial from the same
millisecond as a seeded grant, and a clear after the clock went
back more than an hour writes an epoch other tabs can still read. That capped
epoch cannot void decisions dated after it that a runtime which missed the
clear writes back; times alone cannot order a clear against a clock that went
back more than an hour. When the cookie and its localStorage copy hold
conflicting decisions from the same millisecond, the denial wins. The
subject comes from the cookie, which a server-side restoration or a sibling
subdomain can rewrite on its own, unless this browser's last write reached
only localStorage and the cookie has not changed since; such a write leaves a
`<storageKey>-cookie-miss` marker in localStorage. A localStorage write that
fails while the cookie write lands removes the older local copy.

New API:

- `runtime.reconcileStorage()` and `persistence.reconcile()` read stored
  records on demand and return whether anything changed. React's
  `usePersistence()` handle has `reconcile()` too.
- `persistence: { sync: false }` keeps storage but turns off the automatic
  reads. `dispose()` removes the listeners.

See [keep open tabs in step](https://c15t.com/docs/guides/consent-state#keep-open-tabs-in-step).

### Record consent saves replayed after the policy token expired

A save that fails in the browser is queued and replayed on the next page load or when the browser comes back online, for up to 7 days, with the original click time and policy snapshot token. The self-hosted backend's tokens expire after 30 minutes, so a replay after that was refused with `409 POLICY_SNAPSHOT_INVALID` and the choice stayed in the browser only. The queue then retried it until its 10 attempts ran out.

The backend now records a late save when the token was valid at the save's `givenAt`: the signature, issuer and tenant audience verify, `givenAt` is within the token's lifetime (with 10 minutes of slack for the visitor's clock), the request arrives within `policySnapshot.replayWindowSeconds` of expiry (default 7 days; `0` turns it off), and the manifest still has the policy the token names under the same fingerprint. The record keeps `givenAt` as sent and gets `runtimePolicySource: 'snapshot_token_replayed'`. Saves that arrive while their token is valid are unchanged.

Refusals are now specific. A choice made after the token expired, or a replay after the window, is `409 POLICY_SNAPSHOT_EXPIRED`. A token naming a policy that has since changed is `422 STALE_POLICY` with reason `policy-changed`, live or late, so a choice is never recorded against a policy the visitor didn't see. A token that doesn't verify is still `409 POLICY_SNAPSHOT_INVALID`.

`@c15t/core`'s hosted and manifest transports throw a `ConsentSaveRejectedError` for these refusals, and the kernel drops the save instead of queueing or retrying it. The choice stays recorded in the browser. Queued older saves for the same categories are dropped too, so a grant queued while offline can't replay after the visitor's newer choice was refused. `save:replayed` events carry the backend's code in `rejected`. A custom transport can throw `ConsentSaveRejectedError` to get the same behaviour; `isConsentSaveRejection()` checks for one. Both are exported from `@c15t/core` and `@c15t/core/transports`.

### Migration

- Code that reads consent records and switches on `runtimePolicySource` should handle `snapshot_token_replayed`.
- Code that matched `409 POLICY_SNAPSHOT_INVALID` from `POST /subjects` should also expect `409 POLICY_SNAPSHOT_EXPIRED` and `422 STALE_POLICY` with reason `policy-changed`.
- To keep refusing every save that arrives after its token expired, set `policySnapshot.replayWindowSeconds: 0`.

### Accept `networkBlocker` in the Vue plugin, Nuxt module and Astro integration

The plain Vue plugin started the network blocker when its options carried `networkBlocker`, but `C15tVuePluginOptions` did not include the option, so passing it was a type error. The plugin's options type now covers everything it starts on mount: `networkBlocker`, `iframeBlocker`, `scripts`, `storageConfig` and `nonce`. `RuntimeConsentConfig` and `UseNetworkBlockerOptions` are exported from `@c15t/vue/vue-plugin`.

The Nuxt module accepts `networkBlocker` in `nuxt.config.ts` under `c15t`, without `onRequestBlocked`, because module options reach the browser as JSON.

The Astro integration ignored network blocking entirely. It now takes `networkBlocker` in the integration options, and in the client extension when you need `onRequestBlocked`.

### Share script lifecycle with external consent providers

Add an external consent source to the framework-independent runtime, React, Vue/Nuxt, Svelte/SvelteKit, browser, and Astro entrypoints. Next.js and TanStack Start inherit the controls through React options. Provider decisions update effective gates without creating c15t receipts or mounting a second persistence layer. Route preference controls to the external provider through a shared kernel event, report errors through lifecycle callbacks, and reload the page when the source withdraws a granted category, using the existing `reloadOnConsentRevoked` option and `onBeforeConsentRevocationReload` callback. Keep React script modules lazy through a lightweight controls entrypoint.

Add consent-aware custom event and SPA pageview dispatch to the script SDK, preserve Google tag configuration, support custom GTM data layers and Segment load options, and declare the script SDK's core runtime dependency for isolated package installations.

Keep disabled runtimes permissive when an external source is configured. Complete browser readiness after connecting the source, keep Astro preference triggers available, and reject IAB saves owned by an external CMP. External permissions disable c15t IAB authority. Deliver events for built-in Umami, Rybbit and Matomo integrations, and preserve custom GTM queue names during initialization and dispatch.

Report external CMP subscription failures without aborting provider startup. Keep optional permissions denied and ignore notifications from the failed connection.

### Render theme CSS on the server

**Breaking.** The browser no longer generates theme CSS. `ConsentProvider` (and `ConsentRoot`) used to turn `options.theme` tokens into a `<style id="c15t-theme">` element on every page, so every visitor downloaded the theme generator and the default theme, about 1.7 KB gzip. The package stylesheet already carries the default tokens, so the provider now renders no theme style at all.

Render custom tokens with the new `ConsentTheme` component, exported from `@c15t/react`, `@c15t/nextjs`, `@c15t/tanstack-start` and the `c15t/react`, `c15t/next` and `c15t/tanstack-start` entries. It is not a client component: render it from a Server Component and the generator stays on the server. `ConsentTheme` takes `theme`, `colorScheme` (`'light'`, `'dark'` or `'system'`, applied before hydration) and `nonce`. `generateThemeCSS()` from `@c15t/ui/theme` now escapes `<`, so its output is safe inside a `<style>` element wherever you render it.

`@c15t/svelte`'s provider no longer injects the token CSS after hydration, which also removes the one-frame flash of default colors in SvelteKit. `@c15t/astro` now renders the integration's `theme` tokens on the server, next to the config script, instead of leaving them to the dialog islands.

### Migration

- **Next.js App Router.** Move the theme to a module without `'use client'`. Render `<ConsentTheme theme={theme} />` in the root layout (a Server Component) next to your consent wrapper, and pass `colorScheme` and `nonce` there if you set them on `ConsentRoot`. Keep `options.theme` on `ConsentRoot` only for `consentActions` and slot styles.
- **Next.js Pages Router.** Render `ConsentTheme` in `pages/_document.tsx`.
- **TanStack Start.** Return `generateThemeCSS(theme)` from a `createServerFn` handler in the root loader and render it in a `<style id="c15t-theme">` in the head. Rendering `ConsentTheme` in the root component also works but ships the generator.
- **React without server rendering.** Render `ConsentTheme` next to the provider (this ships the generator), or put the output of `generateThemeCSS(theme)` in your stylesheet.
- **SvelteKit.** Return `generateThemeCSS(theme)` from `+layout.server.ts` and render it inside `<svelte:head>`. Keep slot styles and `consentActions` in `options.theme`.
- **Astro.** Keep tokens in the integration's `theme`. Tokens in the client entrypoint's `theme` are no longer applied.
- **Light and dark at runtime.** Render `ConsentTheme` without `colorScheme` and toggle the `dark` class on `<html>` (for example with next-themes): its output holds both schemes. The provider's `colorScheme` option still keeps the `c15t-dark` class in sync after hydration.
- **Switching token sets at runtime.** Render `ConsentTheme` from a client component and change its props.
- Keep importing the package stylesheet. It holds the default tokens the provider used to inject.

In development, the provider warns when `theme` holds tokens but the page has no `c15t-theme` stylesheet.

### Keep dialog CSS out of the render-blocking stylesheet

**Breaking.** `styles.css` now carries only what a first paint can show: the default tokens, every c15t CSS variable, and the rules for the banner, `ConsentDialogTrigger` and the `ConsentGate` placeholder. It shrinks from 125 KB to 66 KB (16.2 KB to 8.8 KB gzipped). The dialog and preference-widget rules moved to `@c15t/ui/styles/dialog.css`, which the dialog's module imports, so your bundler ships them with the dialog's lazy chunk and applies them before the dialog renders. In a Next.js production build the page's stylesheet drops from 18.2 KB to 10.6 KB gzipped.

- `@c15t/ui/styles.css` and `styles.tw3.css` no longer contain the dialog, preference widget, accordion, switch, tabs, collapsible, preference item or vendor list rules. React, Next.js and TanStack Start load them for you. If you render `@c15t/ui` class maps for those parts in your own components, import `@c15t/ui/styles/dialog.css`.
- `@c15t/react/primitives` and every `@c15t/react/primitives/*` entry load the dialog stylesheet, because the accordion, collapsible, preference item, switch and tabs rules moved there.
- JavaScript loads the dialog rules through the new `@c15t/ui/styles/dialog` module. Bundlers follow its import of `styles/dialog.css`; under the `node` export condition it imports nothing, so plain Node (the Pages Router, or SSR that keeps dependencies external) can load every `@c15t/react` entry. Import it instead of the `.css` file from components that can run on the server.
- The rules for the `@c15t/ui/styles/primitives` class maps moved to `@c15t/ui/styles/primitives.css`. The React components never used them. `c15t/svelte/styles.css` imports them; other hosts that render those class maps import the file themselves.
- `iab/styles.css` no longer repeats the default tokens and the shared rules. Import it after `styles.css`, as the IAB guides already say.
- Tailwind 3: the dialog stylesheet goes through your PostCSS pipeline, and Tailwind 3 rejects its `@layer components` block. Add `@c15t/ui/postcss-tailwind3` before `tailwindcss` in your PostCSS plugins. Without it the build fails with "`@layer components` is used but no matching `@tailwind components` directive is present".
- If you import `styles.css` into a named layer (`@import '…/styles.css' layer(c15t)`), the dialog rules still join the top-level `components` layer.

Svelte, Astro, Vue and the script-tag build render the same styles as before. `c15t/svelte/styles.css` still holds every rule, because Svelte loads its dialog with the page. Astro injects the banner rules; the React and Svelte dialog islands import the rest, which Astro links on every page, and with `ui: 'vue'` the integration injects them. If you set `styles: false` with `ui: 'vue'`, also import `@c15t/ui/styles/dialog.css`. `@c15t/browser` inlines the dialog rules as before.

### `useNetworkBlocker` holds matching requests from its first render

The standalone `useNetworkBlocker` hook installed the blocker from a mount effect. Effects in the calling component's children, and in components rendered before it, run first, so matching `fetch` and XHR requests sent from them went out without a consent check on first visits and for visitors who had rejected. The hook now holds matching requests from the first render of the component that calls it, the same way the provider's `networkBlocker` option does since the previous release, and the blocker decides them once it loads.

Holds are now tracked per caller. When a page uses both the provider option and the hook, one blocker loading or one component unmounting no longer releases requests that the other's rules still hold. A blocker configured with `enabled: false` holds nothing and no longer sends requests another caller holds. `createConsentRuntime()` (which the Svelte, Astro and browser packages use) and the Vue plugin follow the same rules, and a runtime or Vue context disposed before it starts ends only its own hold. The requests it held are answered as blocked (a 451 response for `fetch`, a failed XHR) rather than sent, since nothing checked consent for them.

### Migration

The hook's first render in the browser now has a side effect: it patches `fetch` and `XMLHttpRequest` to hold requests that match its rules. On the server it still does nothing. If React discards that render and never commits it (a render that throws, or an attempt thrown away while suspending), the hold ends after 10 seconds and the requests it held fail as blocked (a 451 response for `fetch`, a failed XHR), since nothing checked consent for them. The same applies when the hook's component, or the provider, unmounts before its blocker loads. No code changes are needed. If a test asserts that `window.fetch` is untouched after rendering a component that calls the hook, update it: during the first render `window.fetch` is the hold's wrapper, and after the blocker loads it is the blocker's.

### Stop Nuxt pages from downloading every locale on first load

In a Nuxt 4 build, every page downloaded the all-locale translations chunk (about 57 KB gzip, 206 KB raw) in its first load, in server manifest mode, hosted mode and client manifest mode alike. Only client manifest mode uses it. The Vue runtime imported the manifest resolver and the translations with two separate `import()` calls, and Vite 8 put a helper that the app entry needs into the translations chunk, so the entry loaded that chunk statically.

The runtime now loads both through one module. Server manifest and hosted mode no longer download the translations. Client manifest mode, which resolves the manifest as the page starts, now bundles the resolver with the entry through a plugin the Nuxt module adds in that mode, so the page still preloads it. Plain Vue apps built with Vite were not affected and load the same code as before.

### Defer the dialog and widget on their split entries

**Breaking.** `@c15t/react/consent-dialog` and `c15t/react/consent-dialog` now export the deferred `ConsentDialog`, the same component as the `@c15t/react` root. The dialog's code loads when it first opens, so importing the split entry no longer puts the dialog in every page's first load. Before, this entry exported the dialog itself. In a Next.js production build of a provider, banner, dialog and link imported from split entries, the change takes 4,411 B gzip of JavaScript out of what the page requests before its `load` event.

`@c15t/react/consent-widget` and `c15t/react/consent-widget` likewise export the deferred `ConsentWidget` from the root entry.

Both entries now export only the component and its prop and compound types. The individual parts they also exported, such as `Card`, `Header`, `Overlay`, `ConsentDialogRoot`, `Accordion`, `Switch` and `Footer`, are no longer exported from them.

### Migration

- `<ConsentDialog />` and `<ConsentWidget />` from the split entries need no change. `ConsentDialog.Card` and the other `ConsentDialog.<Part>` properties still work and load with the dialog's chunk.
- If you imported a part by name, import it from the component entry instead:

  ```ts
  // Before
  import { Card, Header } from 'c15t/react/consent-dialog';
  // After
  import { Card, Header } from 'c15t/react/components/consent-dialog';
  ```

- To keep the dialog in the first load, import `ConsentDialog` from `c15t/react/components/consent-dialog` (or `@c15t/react/components/consent-dialog`). The first open then needs no download, and every visitor downloads the dialog.

### Reload the page when a visitor revokes consent

Revoking consent removed a vendor's script element but left its code running. Listeners, timers, history hooks and chat widgets kept working until the next full page load. v2 reloaded the page on revocation, and v3 lost that behaviour when the consent policy contracts were unified.

When an accept, reject or save turns off a category or vendor that was granted, the page now reloads after every in-flight save request settles, so the next page runs only permitted code. `onBeforeConsentRevocationReload` runs just before the reload. A first visit that rejects under opt-in does not reload, because nothing gated had run. Rejecting defaults under opt-out does, because gated code ran before the choice. Expiry, policy changes and privacy signals do not reload.

Set `reloadOnConsentRevoked: false` to turn this off. The option is available on `ConsentProvider`, `ConsentRoot` `options`, `createConsentRuntime()`, the Vue plugin config, the browser client, and the Astro integration. `@c15t/svelte` receives it through its runtime options.

### `ConsentGate` mounts a granted embed after hydration

**Breaking.** With the App Router's awaited `resolveConsent` layout, a returning visitor
who had allowed the category downloaded a `ConsentGate` iframe twice. The
page streams inside a `Suspense` boundary, and React moves that HTML into
place after the browser has parsed it. The browser starts loading the
iframe during parsing and loads it again after the move.

`ConsentGate` no longer puts granted children in the server HTML. A denied
category still gets the placeholder there. A granted category gets the empty
wrapper, and its children mount once hydration completes, so the iframe loads
once in every layout. Client-side renders mount the children at once, as
before.

### Migration

- Server HTML for a granted `ConsentGate` no longer contains its children.
  Tests or crawlers that read the embed from the server response need to wait
  for hydration.
- Size the wrapper with `className` or `style` so the page keeps the embed's
  space while it mounts.

### Re-render Vue components only when their consent value changes

`useHasConsent()`, `useConsentInit()` and `useConsentPolicyActions()` returned a new array or object on every kernel update, so a component reading one re-rendered whenever anything changed, including opening the dialog. They now keep their previous value while its contents are unchanged. A component using `useHasConsent()` re-renders when a category is granted or revoked, and one using `useConsentInit()` when translations, location, branding or IAB data change. The stock banner, dialog and preference widget read these values too, and follow the same rule.

### Load the Vue dialog's stylesheet with the dialog

The stock banner's description imported the dialog's style map, and a style map brings its stylesheet with it. So every page with the banner loaded the dialog's rules up front; in Nuxt they were part of the render-blocking entry stylesheet (14.7 KB raw, 2.3 KB gzip). The banner now renders its description without the dialog's map, and the dialog's rules load with the dialog's own chunk. `ConsentDescription` keeps its props and output.

### Server rendering no longer waits on a slow or failing consent backend

`resolveConsent` in Next.js and TanStack Start, and server rendering in Nuxt, now wait at most `timeoutMs` (500 ms by default) for the visitor's policy. Before, a backend that never answered held an awaited layout blank for the manifest cache's 10 second timeout. When the budget runs out, the page renders without consent UI in the server HTML, optional categories stay denied and consent-gated scripts and iframes stay blocked. The browser then resolves the policy and shows the banner once the backend answers. The manifest request keeps running and fills the cache for the next request.

The server manifest cache now remembers a failed request when nothing usable is cached. It waits 1 second before asking the backend again, doubling up to 5 seconds while failures continue; requests in between fail at once with a `ManifestUnavailableError`. Before, every request after a cold failure went to the backend. Concurrent requests still share one upstream request, and a stale copy is still served only inside the backend's `stale-while-revalidate` window. The upstream request timeout drops from 10 to 5 seconds.

Next.js `resolveConsent` reads the manifest through the in-process cache whatever `manifestURL` points at. A warm render no longer makes a request to your own manifest route, and a `manifestURL` pointing at the backend no longer fetches it on every render.

The Nuxt init route no longer falls back to the backend's `/init` for every request while the manifest is backing off. It still falls back when the backend has no `/manifest` endpoint.

### Migration

- Pages whose backend takes longer than 500 ms on a cold cache now render the banner after hydration on that request instead of in the server HTML. Raise `timeoutMs`, or set `timeoutMs: false` to wait as before, up to the new 5 second request timeout.
- Pass `waitUntil` to Next.js `resolveConsent`, or `onBackgroundRevalidate` to TanStack Start `resolveConsent`, so serverless platforms keep a manifest request alive after the render stops waiting for it.
- Code that retried the manifest cache in a loop after a failure now receives `ManifestUnavailableError` with `reason: 'backoff'` until the retry floor passes. Its `retryAfterMs` says when the next attempt is allowed.
- Next.js `resolveConsent` now refuses to forward `forwardHeaders` credentials to a plain `http://` manifest URL on a host other than loopback, matching the route handlers; the render falls back to the baseline state and reports the error.

### Add `c15t/astro` to the `c15t` package

Astro sites can install `c15t` and import `c15t/astro`, like `c15t/react`
and the other framework entry points. The named components are at
`c15t/astro/components/<name>.astro`, and the stylesheets at
`c15t/astro/styles.css` and `c15t/astro/iab/styles.css`.

To support it, `@c15t/astro`:

- exports `./components/consent-script.astro` by name, like its other
  components;
- resolves the entry points it hands to Astro (middleware, routes, the page
  script, the dialog islands and the stylesheets) to file paths, so a site
  installed with pnpm that only lists `c15t` still builds;
- keeps its stylesheet in one file, so the copy `c15t` ships stays
  self-contained.
- marks its `astro` peer optional, so installing `c15t` for React, Next.js,
  Vue or plain JavaScript does not pull in Astro.

### Remove `useConsentManager()`

**Breaking.** `useConsentManager()` is no longer exported from `@c15t/react`, `@c15t/nextjs`, `@c15t/tanstack-start`, their `/headless` entries, or the `c15t/react`, `c15t/next` and `c15t/tanstack-start` umbrella entries. The undocumented `useConsentManagerDraft()` on `@c15t/react/draft` is gone with it. The hook subscribed to the whole consent snapshot, so each caller re-rendered on every change. Read each field through its own hook, which re-renders only when that value changes.

`useSubscribeToConsentChanges()` and `useRegisterConsentCategories()` are now exported from the main entries as well as `@c15t/react/hooks`.

| `useConsentManager()` field | Replacement |
| --- | --- |
| `activeUI`, `setActiveUI` | `useActiveUI()` (can be `null`), `useSetActiveUI()` |
| `has(category)` | `useConsent(category)` |
| `consents`, `effectivePermissions`, `explicitChoice` | `useConsents()`, `useEffectivePermissions()`, `useExplicitChoice()` |
| `promptRequirement`, `noticeDismissal`, `privacySignals`, `optOutDirectives`, `restrictions` | `usePromptRequirement()`, `useNoticeDismissal()`, `usePrivacySignals()`, `useOptOutDirectives()`, `useRestrictions()` |
| `resolution`, `policyRule`, `policyScopeMode` | `usePolicyResolution()`, `usePolicyRule()`, `usePolicyScopeMode()` |
| `policyCategories` | `usePolicyCategories()` (without the leading `'necessary'`) |
| `policyBanner`, `policyDialog` | `usePromptPresentation()`, `usePreferencesPresentation()` |
| `model`, `branding` | `useModel()`, `useBranding()` (both can be `null`) |
| `iab`, `vendors`, `vendorChoice` | `useIABSnapshot()`, `useDeclaredVendors()`, `useVendorChoice()` |
| `getDisplayedVendors(category)` | `useDeclaredVendors()` filtered by category |
| `subscribeToConsentChanges`, `updateConsentCategories` | `useSubscribeToConsentChanges()`, `useRegisterConsentCategories()` |
| `translationConfig` | `useTranslations()` |
| `selectedConsents`, `setSelectedConsent`, `selectedVendors`, `setSelectedVendor`, `resetDraft`, `draftIsStale` | `useConsentDraft()`: `values`, `set`, `vendors`, `setVendor`, `reset`, `isStale` |
| `consentCategories`, `consentTypes`, `getDisplayedConsents()` | `useConsentDraft().displayedCategories` with `useTranslations().consentTypes` |
| `saveConsents('all' \| 'necessary' \| 'custom')` | `useHeadlessConsentUI().performAction('accept' \| 'reject' \| 'save')` |
| `manager` | Nothing; it was always `null` |

Render components that stage choices with `useConsentDraft()` and save them with `useHeadlessConsentUI()` inside one `ConsentDraftProvider`, so both use the same draft.

`c15t codemods use-consent-manager-to-hooks` rewrites common destructuring forms. Fields it cannot rewrite stay on a `useConsentManager()` call under a `TODO(c15t v3)` comment naming the replacement.

The stock dialog, preference rows, vendor lists, dialog trigger and `ConsentGate` now read only the values they render. Toggling one category in the preferences dialog re-renders that category's row instead of every row.

### Keep consent changes flowing when a listener throws or updates consent

A snapshot subscriber or event listener that throws no longer stops the
listeners after it, and no longer rejects the `commands.save()` that caused the
change. Before, a throwing subscriber kept later subscribers and persistence
from seeing a denial and suppressed `choice:recorded`, even though the
permission had already changed in memory. c15t now passes the error to
`reportError` in a browser page and logs it with `console.error` elsewhere, so a
throwing listener can't end a Bun or Deno server process.

Listeners also receive the snapshot the change produced, and every listener sees
changes in commit order. Before, a subscriber that granted consent again while
being told about a denial made later subscribers see the new grant twice and
miss the denial. Now each of them sees the denial and then the grant. The
`choice:recorded` event of the outer save also carries its own snapshot.
Listeners that keep changing consent in response to each other are stopped
after 100 nested notifications, and the error is reported. Notifications already
queued still arrive, so other listeners end on the current snapshot.

### Block network requests sent before the network blocker loads

The network blocker loaded after mount, so a `fetch` or XHR that matched a rule and was sent from a child component's mount effect, from an effect next to the provider, or from a client module evaluated inside it went out without a consent check. This happened on first visits, for visitors who had rejected, and when the policy request failed or hung. `ConsentProvider` and `ConsentRoot` now hold matching requests from their first render in the browser, and the blocker decides them once it loads. Vue holds them from plugin install until the root mounts. `createConsentRuntime()`, which `@c15t/svelte` and the `c15t` browser client use, holds them from construction until `start()`. A provider that unmounts before its blocker loads, a runtime disposed before `start()`, or a Vue context disposed before its root mounts answers the requests it held as blocked (a 451 response for `fetch`, a failed XHR) rather than sending them, since nothing checked consent for them. Requests another caller still holds keep waiting.

While consent is unknown, a matching request that would be blocked now waits instead of failing. It is sent if the resolved policy and the visitor's stored choice allow it, and blocked if they do not or if the policy fails to load. Requests that match no rule are not delayed. Apps without `networkBlocker` still do not download the blocker; the hold adds about 0.8 KB gzip to first-load JavaScript.

Requests made before the provider renders are still out of reach, including inline scripts, tags loaded before hydration, and client modules that webpack evaluates when a route's chunk loads. The new network blocker pages for Next.js and React describe these limits and how to keep tracking calls out of that window.

## c15t@3.0.0-alpha.2 (alpha)

### Rename `Frame` to `ConsentGate`

`Frame` is now `ConsentGate` in React, Next.js, TanStack Start and Svelte, and Vue's `ConsentFrame` is now `ConsentGate`. The compound parts follow: `ConsentGate.Root`, `ConsentGate.Title` and `ConsentGate.Button`, with `ConsentGateProps` and `ConsentGateCompoundComponent` types. New subpaths are `c15t/react/consent-gate`, `c15t/react/components/consent-gate` and `@c15t/vue/runtime/components/consent-gate.vue`, and Nuxt auto-registers `<ConsentGate>`.

The old names, subpaths and Nuxt component remain as deprecated aliases for the same component. Props, behavior, `frame.*` translation keys, `--frame-*` CSS custom properties and `data-testid="frame-placeholder"` are unchanged.

### Granular consent

Grant a category and still turn one vendor off, outside IAB TCF. Declare vendors with the `vendors` option or the backend manifest, then name them with `vendor` on scripts and network rules and `data-vendor` on iframes. A target loads when its category passes and its vendor is not off; `alwaysLoad` scripts see the result in their callbacks.

The preference centers in React, Next.js, TanStack Start, Vue, Nuxt and Svelte list each category's vendors with a switch per vendor. Switches edit the draft and record on Save, disable while the category is off, and clear on Accept all and Reject all. React adds `useVendorDraft`, `useVendorAllowed`, `useDeclaredVendors` and `useVendorChoice`; `useConsentDraft` gains `vendors` and `setVendor`; the Svelte manager state gains `selectedVendors` and `setSelectedVendor`.

Denials persist in a `<storageKey>-vendors` cookie and localStorage entry and reach the backend as `vendorChoice`. Migration `4-vendor-choice` adds the column, so run the migrator before deploying. A denial has no expiry and does not delete cookies the vendor already set.

Also fixed: the Vue preference center rendered its switches and category rows unstyled in Nuxt, and the Vue and Svelte category description colour differed from React's.

### Remove dialog scheduling delays and preserve IAB actions

Remove first-open scheduling delays from React's aggregate dialog, widget, and compound components while preserving server rendering and hydration. Keep children mounted when an external runtime provides IAB context, so loading the bridge cannot reset local drafts.

Remove the extra Suspense delay from Astro's React IAB dialog island.

Queue external-runtime IAB actions until the runtime publishes its handle, and reject pending saves with AbortError when the borrowing provider unmounts. Correct the React and Next.js peer dependency ranges to require React and React DOM 18 or newer, matching the APIs already used by v3. Upgrade both React packages before using v3 on an older installation.

# c15t

## 3.0.0-alpha.1

### Minor Changes

- dd44a61: Add opt-in `clearOnRevocation` configuration to remove declared cookies, localStorage keys, and sessionStorage keys when their consent category is denied or revoked. Support exact names, prefix patterns, and cookie scopes while protecting c15t consent records.

### Patch Changes

- 46f45c4: Render theme CSS in the server HTML to prevent React and Next.js consent banners from flashing default styles before hydration. Preserve the stylesheet and CSP nonce through hydration, and escape theme values so HTML-like strings remain inside the stylesheet.

  Apply explicit dark mode and system color preferences before hydration while preserving client-side theme updates.

  Reduce the theme generator's initial JavaScript and generated CSS size without changing theme tokens or contrast colors.

- Updated dependencies [dd44a61]
- Updated dependencies [46f45c4]
  - @c15t/core@3.0.0-alpha.1
  - @c15t/react@3.0.0-alpha.1
  - @c15t/nextjs@3.0.0-alpha.1
  - @c15t/tanstack-start@3.0.0-alpha.1
  - @c15t/vue@3.0.0-alpha.1
  - @c15t/ui@3.0.0-alpha.1

## 3.0.0-alpha.0

### Major Changes

- 4460e3e: This v3 alpha is for internal use only. APIs are unstable, and breaking changes will occur between alpha releases.

  Introduce the c15t umbrella package, shared consent runtime and policy rules, rewritten backend, and new framework and script-tag integrations. Update the CLI, IAB support, DevTools, and shared styles for v3.

  Packages now ship ESM only. Keep related packages on compatible v3 alpha versions.

  Export `defineTheme` and the `Theme` type from the React, Next.js, TanStack Start, and Vue entries so themes can use the same imports as their framework integration.

  Restrict iframe-blocker URL activation to HTTP and HTTPS. Replace backtracking URL and theme parsing expressions, correct the PostHog hostname boundary, and fix CLI layout detection for nested route groups and locale directories.

  Serve a stale consent manifest from the server adapters' in-process cache inside the backend's `stale-while-revalidate` window while one background request revalidates it, instead of blocking every request after `s-maxage` expires; a failed or timed-out revalidation keeps the stale manifest. The backend sends its manifest cache policy as `CDN-Cache-Control` too, so Vercel's CDN forwards it. Add `onBackgroundRevalidate` to the core cache and every server adapter for runtimes that stop detached work after the response.

### Patch Changes

- Updated dependencies [4460e3e]
  - @c15t/core@3.0.0-alpha.0
  - @c15t/nextjs@3.0.0-alpha.0
  - @c15t/react@3.0.0-alpha.0
  - @c15t/tanstack-start@3.0.0-alpha.0
  - @c15t/ui@3.0.0-alpha.0
  - @c15t/vue@3.0.0-alpha.0
