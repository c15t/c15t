## @c15t/cli@3.0.0-alpha.11 (alpha)

### Add a Vercel Speed Insights integration

`vercelSpeedInsights()` from `@c15t/integrations/vercel-speed-insights` loads
Vercel's Web Vitals collector once measurement is allowed. The collector keeps
running after its script is removed, so on revocation the helper also drops
every report through Speed Insights' `beforeSend` hook. Pass your own
`beforeSend` to edit reports while measurement is allowed. Remove
`<SpeedInsights />` or `injectSpeedInsights()` from `@vercel/speed-insights`
when you switch. The CLI offers Vercel Speed Insights in its integration picker.

## @c15t/cli@3.0.0-alpha.10 (alpha)

### Framework generation writes the quickstart files

`setup --framework <target>` (and `generate`) now writes the same files the
framework quickstarts show, at the same paths, instead of wrapper files in
`src/consent/`. For example, `--framework next-app` writes `.env`,
`next.config.ts`, `c15t.config.ts` and `app/layout.tsx`.

```bash
npx @c15t/cli@alpha setup hosted --framework react --backend-url https://your-project.inth.app --apply
```

- Hosted mode writes the backend URL to `.env` under the framework's public
  env var (`NEXT_PUBLIC_C15T_BACKEND_URL`, `NUXT_PUBLIC_C15T_BACKEND_URL`,
  `PUBLIC_C15T_BACKEND_URL` or `VITE_C15T_BACKEND_URL`). An existing `.env`
  keeps its other keys. One that already sets the matching
  `*_INTH_PROJECT_URL` gets no c15t variable, which would override it. The
  CLI never creates or edits `.gitignore`.
- Generated code uses the v3 API only: `manifest()`, `hosted()` and
  `offline()`, `defineConsentConfig`, `withConsentManifest`, `ConsentRoot`
  and `ConsentDialogLink`. Templates that pass a backend URL in code write
  `hosted({ backendURL })`, not `hosted({ url })`. The Astro templates write
  `ConsentDialogLink` instead of `ConsentDialogTrigger`, and the TanStack
  Start template no longer writes `initRoute`.
- New targets: `astro-static` (static output, `hosted()`) and `html` (the
  `c15t.js` script tag). `--boilerplate` picks `astro` or `astro-static` from
  whether the project has a server adapter.
- An existing file with other contents stops generation and is listed in the
  error. Pass `--overwrite` to replace it. `.env`, `index.html` and
  SvelteKit's `src/app.d.ts` get the c15t lines added instead.
- Removed: `--output` and the generated `README.md`. In `@c15t/cli/generate`,
  `GenerateOptions.output` is gone, and plans gain a `merge` map with a
  `mergeFile()` helper for files the project already has.

The `consent-provider-options` codemod writes `hosted({ backendURL })`
instead of `hosted({ url })`. It imports `hosted()` and `offline()` from
`c15t/react` (or `@c15t/react`) when the provider comes from a Next.js or
TanStack Start entry, whose `hosted()` is plain data for
`defineConsentConfig`. It also leaves an existing `manifest()` mode alone.

### Move `@c15t/react` and `@c15t/nextjs` imports to `c15t` in the v3 codemods

The v3 codemods left `@c15t/react` imports and `@c15t/react/styles.css`
imports in place, so an app that had switched its dependencies to `c15t`
still imported packages it no longer installed.

The new `packages-to-c15t` codemod runs before the other v3 codemods. It
points `@c15t/react` imports at `c15t/react`, `@c15t/nextjs` imports at
`c15t/next`, and, in a Next.js app, the `@c15t/react` root at `c15t/next`.
Subpaths such as `/headless` and `/components/consent-dialog-link` keep their
names. It points the `@c15t/react/postcss-tailwind3` and
`@c15t/nextjs/postcss-tailwind3` PostCSS plugins at `c15t/postcss-tailwind3`.
It removes `styles.css` imports, because v3 components add their own
styles. With Tailwind CSS 3 or a cascade layer it keeps the import, points it
at `c15t`, and leaves a `TODO(c15t v3)` comment to set `styles: false`. It
does the same, with a warning, when it can't tell the Tailwind CSS version.

```bash
npx @c15t/cli@alpha codemods packages-to-c15t --dry-run --json
```

If `package.json` lists `@c15t/react` or `@c15t/nextjs` without `c15t` v3,
the codemod keeps the scoped imports and prints a warning. It does not edit
`package.json`.

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

### Give coding agents the full c15t setup and migration rules

`c15t setup --codex` and `createAgentSetupPlan()` now hand the agent step-by-step
rules for installing c15t, upgrading from v2 or replacing another consent banner.
The agent inventories the app's analytics, pixels and embeds first, then picks
the install, upgrade or replace path. It resolves exact versions from the CLI's
npm dist-tag and checks that only one copy of `@c15t/core` is installed. It runs
the upgrade guide's codemod command with every transform, and replaces framework
vendor packages such as `@next/third-parties` and `@nuxt/scripts` with c15t
loaders. Finally it checks first visit, reject, accept and withdrawal in a
browser.

Docs links in the task point at the site for the CLI's release line. A v3
prerelease CLI links to `https://v3.c15t.com` and resolves versions from
`@alpha`. A stable CLI links to `https://c15t.com` and resolves from `@latest`.

`@c15t/cli/frontend/agent` also exports `createC15tSetupInstructions()`, which
returns these steps without a title or account steps. Hosts can put their own
account and backend steps first. It accepts `origin`, `distTag`, `mode` and
`firstStep`. `createC15tIntegrationGuidance()` returns only the consent-gating
rules, for hosts that embed them in another prompt or skill.

### Keep the app's own `ConsentProvider` working after `consent-provider-options`

When a file declares its own `ConsentProvider`, such as a wrapper around
`ConsentManagerProvider`, the codemod now imports
`ConsentProvider as ConsentManagerProvider` and leaves the JSX alone. It used
to import `ConsentProvider` over the wrapper's name, so the wrapper rendered
itself.

### Point setup agents at upgrade guides that exist

The upgrade rules in `c15t setup --codex` and `createC15tSetupInstructions()`
sent Vue, Nuxt, Svelte, Astro and TanStack Start apps to the root
`/docs/upgrade-v3.md` guide, which has been removed. The agent now picks the
Next.js, React or JavaScript guide by the v2 package the app uses:
`@c15t/nextjs`, `@c15t/react` or the `c15t` store. An app that runs its own
`@c15t/backend` is pointed at the self-host upgrade guide.

## @c15t/cli@3.0.0-alpha.7 (alpha)

### Add a Sentry integration

Add `sentry()` from `@c15t/integrations/sentry`, with CDN and app-managed SDK modes,
CLI setup and the `@c15t/scripts/sentry` compatibility export. Errors run before
consent by default; Replay and SDK data collection wait for measurement.
`loadMode: 'after-consent'` gates errors too.

Apply consent at initialization and before sending data. Withdrawal stops Replay
without flushing pending recordings. Shared configurations coordinate consent and
reuse the SDK bundle and recorder across renders.

Add core `Script.observeConsentBeforeLoad` and `Script.resourceKey`. Shared
resources retain each registration's callbacks, consent and ownership, including
registrations that join after loading completes.

## @c15t/cli@3.0.0-alpha.6 (alpha)

### Add codemods for the rest of the v2 to v3 upgrade

`c15t codemods` gains eleven v3 transforms. Each runs only when you name it.

- `consent-provider-options` renames `ConsentManagerProvider` to
  `ConsentProvider` and moves its options to `hosted()`,
  `offline({ policyRules })` and `iframeBlocker`.
- `root-exports-to-subpaths` moves imports that left the `c15t/react` and
  `c15t/next` roots to their subpaths.
- `dev-tools-to-c15t` points `@c15t/dev-tools/react` and `/tanstack` at
  `c15t/next/devtools` or `c15t/react/devtools`.
- `policy-packs-to-policy-rules` renames `policyPackPresets` to
  `policyRulePresets` and `worldNoBanner()` to `worldOptOutNoPrompt()`.
- `css-variables-to-v3` renames `--consent-widget-*` and `--frame-*`.
- `postcss-tailwind3` adds the c15t plugin before `tailwindcss` in an
  object-form `postcss.config`.
- `callbacks-to-v3`, `theme-to-consent-theme` and `iab-option-to-iab-provider`
  rename what they can and mark the rest for manual work.
- `node-sdk-to-v3` moves `@c15t/node-sdk` code to `createC15tClient()`.
- `backend-config-to-v3` moves `policyPacks`, `branding`, `customTranslations`,
  `i18n` and `appName` under `manifest`.

Where a change needs a decision, the codemods leave a `TODO(c15t v3)` comment,
and most keep the v2 code so type-checking fails until you finish. Run them with
`--dry-run --json` first to review.

## @c15t/cli@3.0.0-alpha.5 (alpha)

### Save consent when the decision table's unique index differs

On Postgres and SQLite, runtime policy decisions were inserted with `on conflict ("dedupeKey")`. A database whose `runtimePolicyDecision` table had no unique index on `dedupeKey` alone, such as one indexed on `(tenantId, dedupeKey)`, rejected that statement, so every consent save that recorded a decision failed with a 500. When the database has no index for that conflict target, decision inserts now retry with a conflict on any unique index treated as the duplicate. Databases with the expected index keep the targeted statement.

`createMigrator().plan()` and `apply()` report schema problems they do not repair in a new `drift` field, and `c15t self-host migrate --plan` prints them as warnings. The first check flags a decision table without a unique index on `dedupeKey` alone and gives the `create unique index` statement to add it. A composite index on `(tenantId, dedupeKey)` does not deduplicate single-tenant rows, because `tenantId` is null there.

### Fix generated React and Next.js styles

Render theme preset tokens with ConsentTheme and use important utility modifiers
for the Tailwind CSS 3 preset. Choosing None keeps the default c15t theme, including
with compound components. Find global stylesheets through semicolon-free imports
and tsconfig or jsconfig aliases, and show a setup warning when the stylesheet
cannot be found.

Move the starter universal margin and padding reset into the base layer for
Tailwind CSS 4 and plain CSS apps, so it no longer collapses the banner and dialog.

Recognize Tailwind 3 comparator ranges, skip stylesheet aliases outside the app,
and report only the stylesheet edits setup actually makes.

## @c15t/cli@3.0.0-alpha.4 (alpha)

### Update documentation links

Point documentation links in CLI prompts and errors, runtime warnings, TSDoc, package READMEs and package homepages at the current c15t.com docs pages. The old addresses led to pages that were moved or removed.

### Migrate Node module imports to the integrations package

The `scripts-to-integrations` codemod now recognizes `require` functions
created by Node's imported `createRequire()`, including aliased imports. It
leaves custom functions and shadowed parameters unchanged. Codemods also scan
`.mts`, `.cts`, `.mjs`, and `.cjs` source files.

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

### Native frontend workflows, `setup --codex`, and Inth accounts

**Breaking:** account commands now run through Inth. `c15t login`, `logout`,
`status`, and `projects` use the bundled Inth executable and share its session
with the `inth` CLI. The `authenticate` export is removed, and control-plane
adapters take a working directory, organization, and abort signal instead of
tokens or an API URL. Sessions stored in `~/.c15t/config.json` are no longer
read; run `c15t login` again. `c15t logout` deletes that file.

Inth ships binaries for macOS on Apple silicon, glibc Linux on x64 and arm64,
and Windows on x64. On other platforms, including Intel Macs and Alpine, account
commands fail with `INTH_UNSUPPORTED_PLATFORM`. Pass `--backend-url` or use
offline mode there.

For agents and CI, `c15t login --email <email>` prints an approval URL and code,
and `c15t login --complete` finishes sign-in. `INTH_TOKEN` also works.

`c15t setup --codex` hands frontend setup to the Codex CLI. Add `--plan` to
print the task and copy it to the clipboard instead, or `--plan --json` to
get it as JSON.

New exports let other CLIs run c15t frontend setup without Node:

- `@c15t/cli/generate` builds generation plans.
- `@c15t/cli/frontend` handles setup, project selection, and status with
  host-supplied state.
- `@c15t/cli/frontend/runtime` applies plans to disk, recovers interrupted
  applies, and installs packages with npm, pnpm, yarn, or Bun.
- `@c15t/cli/frontend/agent` builds and launches the Codex task.
- `@c15t/cli/commands` exposes the command registry.

The generate and frontend modules also ship as TypeScript source for static
compilation. Generated installs follow the CLI's release line.

Codex launch and native dependency installation support macOS and Linux. On
Windows, use `--plan` and `--skip-install`.

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

### Keep app `i18n.messages` overrides when the backend sends translations

In hosted and manifest mode, the translations from `/init`, from a server prefetch or from a manifest replaced the app's `i18n.messages` for the same language, so a key overridden in code showed the backend's copy instead. This affected React, Next.js and TanStack Start through the React provider, Svelte and SvelteKit (including `resolveConsent()` prefetches), Astro and `@c15t/browser`.

The backend copy is now the base for the visitor's language and the app's `i18n.messages` for that language are deep-merged over it. An app key replaces the backend's text when it differs from c15t's built-in copy for that language, or for its primary language. A key that repeats the built-in text does not hide the backend's copy, so an app that passes the stock bundles to enable languages, such as `{ ...baseTranslations.de }`, still shows edits made on the backend, while a customized key still wins. Keys the backend does not supply keep the app's copy, so a language the backend does not send still shows the app's copy in full. Overrides for other languages are not applied. A regional language such as `de-AT` uses the overrides under `de` when there is no `de-AT` entry.

Built-in copy is known for English and, once `@c15t/translations/all` has loaded, for every bundled language. Without it, every app key counts as a customization. `@c15t/translations` adds `getStockTranslations()` for this, and `/all` registers its languages when it loads. The package now lists `dist/all.js` under `sideEffects`, so a bare `import '@c15t/translations/all'` survives tree shaking.

Astro also deep-merges `i18n.messages` now. Before, a partial override such as `{ cookieBanner: { title } }` replaced the whole `cookieBanner` section and left its other keys empty. A regional `i18n.locale` or `Accept-Language` such as `de-AT` now renders over the `de` bundle instead of English.

`@c15t/core` now exports `offline()`, a mode for `createConsentRuntime()` that resolves policy rules locally. A language set through the kernel, with `overrides.language` or `kernel.set.language()`, switches the copy when c15t's built-in copy or `i18n.messages` has that language, falling back to the primary language, so `de-AT` uses German copy. Built-in copy covers English, and every bundled language once `@c15t/translations/all` has loaded. A language with no copy gets the startup copy back, still labelled with the startup language. The language a server prefetch detected from `Accept-Language` does not switch the copy until the app has asked for a different language. `@c15t/browser` uses this transport, so `data-language`, the `overrides.language` option and `setLanguage()` now switch the copy in offline mode. The Svelte `offline()` mode is unchanged. The JavaScript, Vue and Solid boilerplate from `@c15t/cli generate` now uses core's `offline()`, and the generated offline kernel config passes `translationsFor` with `baseTranslations` from `@c15t/translations/all`, so generated projects switch to any bundled language too. The CLI installs `@c15t/translations` for that config.

`createOfflineTransport()` accepts `translationsFor` and `detectedLanguage` options with the same behavior. Without `translationsFor` it still relabels its copy with the requested language, as before.

`@c15t/core` also adds a `translationOverrides` kernel option, the `applyTranslationOverrides()` and `resolveLocalTranslations()` helpers, and an optional `translationsFor` on the transport factory context.

### Add a Klaviyo integration

`klaviyo()` from `@c15t/integrations/klaviyo` loads Klaviyo.js, which serves both signup forms and onsite tracking, only once marketing and measurement are both allowed. Pass `category` to use a different consent condition. `mode: 'forms-only'` loads on marketing alone and sets Klaviyo's `__kla_off` cookie before the bundle runs, so forms render while Klaviyo's web tracking stays off. The helper installs Klaviyo's queued `klaviyo` object and sends no `identify` or `track` calls of its own. Unlike Klaviyo's snippet, awaiting, serializing or stringifying that object before Klaviyo.js loads queues nothing, so it cannot stall the calls queued after it.

Registry entries can now declare a compound consent condition in `consentCategory`, such as `{ and: ['marketing', 'measurement'] }`, and there is a new `email-and-sms` integration category. Code that reads `consentCategory` as a string must handle the object form. The CLI offers Klaviyo in its integration picker.

### Use `styles.css` with Tailwind 3

Tailwind 3 apps now import the same stylesheet as every other setup, such as `c15t/react/styles.css` or `c15t/next/styles.css`, and run `@c15t/ui/postcss-tailwind3` before `tailwindcss`. The plugin previously skipped the entry stylesheets, so Tailwind 3 apps had to pick `styles.tw3.css`, and the dialog stylesheet still needed the plugin. It now also flattens `styles.css` and `iab/styles.css`, handles c15t rules that Vite or `postcss-import` inline into your own stylesheet, and covers `@c15t/browser/styles.css` for light-DOM setups, where Tailwind 3 previously dropped the rules without an error and its preflight stripped the banner's button padding and borders.

```js title="postcss.config.mjs"
export default {
	plugins: {
		'@c15t/ui/postcss-tailwind3': {},
		tailwindcss: {},
		autoprefixer: {},
	},
};
```

Use the object form: Vite's PostCSS config loader rejects plugin names in an array.

Import the stylesheet above your `@tailwind` directives. `postcss-import` ignores an `@import` that follows other rules, so the previously documented position between `@tailwind components` and `@tailwind utilities` dropped the c15t rules in Vite apps. When the plugin is missing, Tailwind 3's build error now shows a comment naming it.

`c15t setup` now imports `styles.css` for Tailwind 3 and adds the plugin to your PostCSS config, replacing an existing `styles.tw3.css` import. Before this, it imported `styles.tw3.css` without the plugin, and the build failed on the dialog stylesheet. Setup also installs `@c15t/ui`, so pnpm can resolve the plugin. It edits the active plugin list, including `[name, options]` tuples, and ignores commented-out examples. If the config passes an imported `tailwindcss` binding, lists the c15t plugin after `tailwindcss`, or has no single plugin list to edit, if `package.json` holds the PostCSS config, or if several config files exist, setup prints the change to make instead of guessing which one your build reads. The v1 to v2 `add-stylesheet-imports` codemod keeps importing `styles.tw3.css`, because the plugin does not exist in v2.

`styles.tw3.css` and `iab/styles.tw3.css` still ship and work with the plugin.

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

### Warn that Create React App cannot run the Tailwind 3 plugin

Create React App (`react-scripts`) builds CSS with its own PostCSS setup and never reads `postcss.config.js`, so c15t's Tailwind 3 PostCSS plugin (`c15t/postcss-tailwind3`) cannot run and a Tailwind 3 build fails on c15t's dialog stylesheet. `c15t setup` still added the plugin to a `postcss.config.js` it found and reported success.

For Tailwind 3 apps that depend on `react-scripts`, setup now leaves PostCSS config alone, with or without a config file, and warns instead. To fix the build, add the plugin before `tailwindcss` through CRACO, eject, or move the app to Vite.

Interactive setup now shows this warning and the existing "add the plugin by hand" step, which it previously logged only at debug level. `--non-interactive` setup logs them and returns them in a new `warnings` array, which `--json` output includes.

### Install c15t packages that match the CLI

`c15t setup --apply` and the interactive setup now install c15t packages from the CLI's own release line instead of npm `latest`. A prerelease CLI installs every c15t package from its dist-tag, for example `c15t@alpha` from a 3.0.0 alpha CLI. A stable CLI pins only the packages released together with it, such as `c15t` and `@c15t/dev-tools`, to its major version, for example `c15t@3`. Packages that version on their own, such as `@c15t/ui`, `@c15t/integrations` and `@c15t/svelte`, install from `latest` on a stable CLI. Rerunning setup keeps c15t packages the app already declares on the same release line. A c15t package declared on another major or prerelease channel, such as `@c15t/react@^2` in a v2 app, is installed again from the CLI's line so it matches the code setup writes. Compound ranges such as `>=2 <3` and `^2 || ^3` count by the versions they admit. Under a prerelease CLI, a range that names no prerelease and also admits an earlier major, such as `>=2` or `*`, is installed again, because npm resolves it to the earlier stable release, and so is a dist-tag other than the CLI's own, such as `latest`. `workspace:`, `link:`, `file:` and `portal:` ranges are left as they are, and so are dist-tags under a stable CLI.

`c15t generate` boilerplate now lists the same pinned install command for its c15t packages, and the generated README no longer says the files target unpublished APIs.

### Rename the vendor integrations package

Replace `@c15t/scripts` with `@c15t/integrations` in v3 dependencies and imports.
Vendor subpaths, helper names, and the `scripts` configuration option stay the
same. `@c15t/scripts` remains available as a deprecated compatibility package
throughout v3, re-exporting the same implementation and types. Compatibility
ends in v4; previously published versions remain available on npm.

The CLI installs and imports `@c15t/integrations` in generated applications.
Run `c15t codemods scripts-to-integrations --dry-run --json` to preview import
changes in JavaScript and TypeScript files, then repeat without `--dry-run` to
apply them. Update package dependencies and Vue or Svelte component imports
separately.

## @c15t/cli@3.0.0-alpha.3 (alpha)

### Encode and enforce IAB publisher restrictions

Configure TCF publisher restrictions with `publisherRestrictions` on `createIAB`, `IABProvider`, the runtime's `iab` options or the Astro integration's `iab` options. c15t writes them into the TC string's `PubRestrictions` section, decodes them from stored strings, and reports them through `__tcfapi('getTCData')` as `publisher.restrictions`. Previously that map was always empty and configured restrictions were not encoded.

Consent-gated scripts, network rules and iframes with a `vendorId` now apply the confirmed restrictions: type 0 blocks the purpose, type 1 requires consent and type 2 requires legitimate interest for purposes the vendor list marks as flexible. Accept all grants the vendor signal a restriction needs. Legitimate interest a restriction introduces applies until the visitor objects, so Save Settings encodes it as allowed, matching what the preference centres show.

The React, Vue, Svelte and `@c15t/browser/iab` preference centres list each vendor under the legal basis the restrictions leave it, so a vendor moved to legitimate interest gets an objection control instead of a consent toggle. A purpose whose vendors all use legitimate interest shows no consent switch, only the objection, and display-model rows report this as `hasConsentBasis`. Such a purpose no longer decides its c15t category, so a granular save no longer records a denial that blocks its legitimate-interest vendors; legitimate interest never grants a category on its own. Custom UIs can use `applyPublisherRestrictionsToGVL` from `@c15t/iab/headless` or pass `publisherRestrictions` to `processGVLForDialog`.

IAB gates no longer let a refused c15t category block a target that uses only legitimate interest after publisher restrictions. Such a target needs no consent under TCF, so its purpose and vendor legitimate interest signals, and the visitor's objection, decide. Previously every restriction on a referenced category blocked IAB targets; GPC, opt-out directives and strict scope still do, and the refused category still blocks scripts that name only the category or declare a consent purpose.

Unsupported restrictions throw `PublisherRestrictionError` instead of being dropped. This covers reserved type 3, vendors or purposes missing from the vendor list, legitimate interest for purposes 1 and 3 to 6, basis changes on purposes the vendor does not declare as flexible, conflicting types for one vendor, and restrictions in a string that is not service-specific. `whenReady()`, `save()` and `generateTCString()` reject, and no TC string is written. Retrying `whenReady()` does not fetch another vendor list. With an explicit `gvl`, the error lasts for the handle and saving keeps failing even if the kernel later holds a different list; a CMP following the kernel's list checks a replacement list again. When a replacement vendor list makes a restriction unsupported, the TC authority confirmed under the previous list is cleared. Whenever the CMP withdraws its own authority, including on expiry, it also removes the `euconsent-v2` cookie and localStorage entry. A stored TC string whose restrictions differ from the configuration is not restored; the banner opens again for a returning visitor and closes once they save, IAB gates stay denied until then, and the superseded `euconsent-v2` cookie and localStorage entry are removed. Decoding a string written under TCF policy version 2 or 3 accepts legitimate interest required for purposes 3 to 6, which those versions allowed.

### Show the Astro banner on prerendered pages

`ConsentBanner` rendered nothing on a prerendered page, because the build had
no policy, and the browser could only show or hide a banner that was already in
the HTML.

- In `offline()` mode the build now resolves the policy and renders the banner
  hidden. The browser shows it to visitors who have not chosen yet.
- In `hosted()` and `manifest()` mode, `ConsentBanner` leaves a placeholder.
  The browser renders the banner there, with the same markup as the server
  version, once its init returns a policy that needs one. Returning visitors
  do not download the renderer.
- A banner hidden after a choice no longer stays on screen: the stylesheet
  now makes the `hidden` attribute beat the banner's own `display`.
- The CLI's Astro boilerplate no longer tells you to avoid prerendering.

### Add a Front Chat integration

`frontChat()` from `@c15t/scripts/front-chat` loads Front's chat widget after functionality permission and initializes it once the SDK loads. It forwards CSP nonces, including a loader-level nonce, to Front's generated scripts. `shutdownFrontChat()` asks Front to clear the visitor's session; call it from `onBeforeConsentRevocationReload`. The CLI offers Front Chat in its integration picker.

### Ship Astro consent styles automatically

The quickstart said the integration supplies styles, but it did not. On the
server, the components read class names through the `node` export condition,
which imports no CSS, so the banner and dialog rendered unstyled unless you
imported the stylesheet yourself.

The integration now adds `@c15t/astro/styles.css` to every page, plus the new
`@c15t/astro/iab/styles.css` when `iab` is set. Remove your own import of the
stylesheet. Set `styles: false` to keep loading it yourself, for example from
a global stylesheet that orders its own cascade layers.

The CLI's Astro boilerplate no longer imports the stylesheet.

### Stream consent in the generated Next.js App Router wrapper

With `--ssr` (or "Enable SSR consent prefetch"), `c15t setup` generated an async `ConsentManager` that awaited `resolveConsent` before rendering anything inside it. The layout wraps the whole page in that component, so every response waited for the consent backend's `/init` round trip before its first byte.

The generated `ConsentManager` is now synchronous. It starts `resolveConsent` and passes the pending result to the client provider, which applies it when it arrives. Pages render without waiting for the backend; the banner mounts after hydration. The generated provider's `state` prop accepts either the promise or a resolved state.

To keep the banner in the server HTML, make `ConsentManager` async, await `resolveConsent`, and wrap it in `<Suspense>` in the layout. The page then waits for consent. Existing generated files are not changed.

### Add a OneDollarStats integration

`oneDollarStats()` from `@c15t/scripts/one-dollar-stats` loads the OneDollarStats tracker after measurement permission. It needs no API key. Tracker settings are forwarded as `data-*` attributes; `hostname` must be a bare host, setting names must be valid attribute names, and `'hash-routing': 'false'` omits the attribute because the tracker treats any value as on. The CLI offers OneDollarStats in its integration picker.

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

### Add a Pinterest Tag integration

`pinterestTag()` from `@c15t/scripts/pinterest-tag` recreates Pinterest's base code and loads `core.js` after marketing permission. On revocation it keeps the tag and calls `pintrk('setconsent', false)`, which stops events and clears Pinterest's first-party cookies; a later grant calls `setconsent(true)`. `pinterestTagEvent()` sends typed events for Pinterest's 20 event types and user-defined names. The CLI offers Pinterest Tag in its integration picker.

## @c15t/cli@3.0.0-alpha.2 (alpha)

### Fix declaration imports for Node16 and NodeNext

Fix declaration imports for TypeScript consumers using Node16 or NodeNext resolution. Preserve explicit JavaScript filenames so exported APIs retain their types without requiring `skipLibCheck`.

# @c15t/cli

## 3.0.0-alpha.1

### Patch Changes

- @c15t/scripts@3.0.0-alpha.0
- @c15t/backend@3.0.0-alpha.1

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
  - @c15t/backend@3.0.0-alpha.0
  - @c15t/scripts@3.0.0-alpha.0

## 2.2.0-canary-20260731105620

### Patch Changes

- Updated dependencies [08413ea]
  - @c15t/backend@2.2.0-canary-20260731105620
  - @c15t/scripts@2.2.0-canary-20260727202135

## 2.2.0-canary-20260728085441

### Patch Changes

- Updated dependencies [ee39d2c]
  - @c15t/backend@2.2.0-canary-20260728085441

## 2.2.0-canary-20260727202135

### Patch Changes

- 16a1f82: Dependency audit for the next release: remove unused `@orpc/*` dependencies from `@c15t/backend` and `@c15t/node-sdk`, update runtime dependencies (hono 4.12.27, valibot 1.4.2, defu 6.1.7, jose 6.2.3, zod 4.4.3, zustand 5.0.14, xstate 5.32.4, and more), and force security floors for kysely (SQL injection fixes) and protobufjs via workspace overrides. Builds now use TypeScript 7 (native compiler) with rslib 0.23 for type checking and declaration emit; emitted types are semantically unchanged.
- Updated dependencies [e4315bd]
- Updated dependencies [2556f76]
- Updated dependencies [f98e83d]
- Updated dependencies [584bb09]
- Updated dependencies [ea4c0e4]
- Updated dependencies [585d84d]
- Updated dependencies [4f965cb]
- Updated dependencies [cbf8b37]
- Updated dependencies [8c004cf]
- Updated dependencies [16a1f82]
- Updated dependencies [ab8ecad]
- Updated dependencies [c7e53ff]
- Updated dependencies [e011d19]
- Updated dependencies [c89ce28]
- Updated dependencies [5406a8d]
- Updated dependencies [613ba22]
- Updated dependencies [ca7784f]
- Updated dependencies [dfec101]
- Updated dependencies [30cb116]
  - @c15t/scripts@2.2.0-canary-20260727202135
  - @c15t/backend@2.2.0-canary-20260727202135

## 2.1.0

### Minor Changes

- 4a89092: Expanded the script loader with a registry-backed provider system and a much
  broader set of consent-aware integrations. New helpers cover analytics,
  advertising pixels, functional tools, and tag managers, including Ahrefs,
  Cloudflare Web Analytics, Fathom, Hotjar, Matomo, Microsoft Clarity, Mixpanel,
  Plausible, PromptWatch, Rybbit, Segment, Umami, Vercel Analytics, Reddit Pixel,
  Snapchat Pixel, and Crisp/Intercom.

  Provider manifests now share common utilities for script URL resolution, boolean
  data attributes, install-step builders, Google consent mapping, and lifecycle
  execution. The package also includes registry metadata, focused provider tests,
  and engine coverage so script helpers resolve predictable loader URLs,
  attributes, consent callbacks, and queued vendor calls.

  Google Tag and Google Tag Manager boot timestamps now resolve during script
  lifecycle execution instead of helper construction, which keeps documented setup
  patterns compatible with Next.js Cache Components prerendering.

  PostHog now supports explicit EU/US region selection, keeps the bootstrap script
  host aligned with an explicit API host, and exposes loading modes for immediate
  cookieless consent sync, consent-gated loading, or disabling the helper without
  issuing a PostHog network request.

  Updated the docs and CLI generation prompts so these providers are discoverable
  from the integration docs and script-loader setup flows.

### Patch Changes

- Updated dependencies [4a89092]
  - @c15t/backend@2.1.0
  - @c15t/logger@2.1.0
  - @c15t/scripts@2.1.0

## 2.0.4

### Patch Changes

- Updated dependencies [748536a]
  - @c15t/backend@2.0.4

## 2.0.2

### Patch Changes

- Updated dependencies [85b9106]
  - @c15t/backend@2.0.2

## 2.0.1

### Patch Changes

- 2eb1dca: Place Tailwind v4 c15t stylesheet imports at the end of the top-level import block so preset styles like Fumadocs do not override c15t theme tokens.

## 2.0.0

### Major Changes

- 32617c9: Changelog available at https://c15t.com/changelog/2.0.0

### Patch Changes

- Updated dependencies [32617c9]
- Updated dependencies [32617c9]
  - @c15t/backend@2.0.0
  - @c15t/logger@2.0.0

## 2.0.0-rc.11

### Patch Changes

- 1ae73d3: Update the CLI hosted-backend URL contract to recognize the new `*.inth.app` project domain alongside legacy `*.c15t.dev` URLs.

  - `@c15t/cli`: accept `https://<project>.inth.app` as a valid hosted backend URL, refresh validation and prompt copy to point at the new domain, and update generated hosted config/env/rewrite examples accordingly.

## 2.0.0-rc.10

### Patch Changes

- Updated dependencies [9579b62]
  - @c15t/backend@2.0.0-rc.10

## 2.0.0-rc.8

### Patch Changes

- 5956531: Simplify the 2.0 static prefetch flow so static routes only need to start `/init` early and matching prefetched data is consumed automatically during first store initialization.

  - `c15t`: add canonical request-context metadata for SSR and browser-prefetch payloads, auto-consume matching prefetched data on first runtime/store initialization, and replace blanket SSR skip-on-overrides behavior with exact request-context matching.
  - `@c15t/react`: preserve the dynamic SSR `fetchInitialData()` flow while exposing the new `context_mismatch` SSR status behavior for matching overrides, backend URLs, credentials, and ambient GPC.
  - `@c15t/nextjs`: remove the RC-era public static-prefetch consumer APIs from the package surface and document `C15tPrefetch` as the only static-route setup step.
  - `@c15t/cli`: update generated static-route templates to rely on automatic prefetch consumption instead of wiring manual prefetch lookups.

- 918a70e: Fix published TypeScript declaration packaging so consumers stay compatible across both TypeScript 5 and TypeScript 6.

  - `@c15t/react`: correct the `./primitives` type export entries so they point at the published `dist-types` files instead of missing declaration paths.
  - `@c15t/backend`, `@c15t/cli`, `@c15t/dev-tools`, `@c15t/logger`, `@c15t/node-sdk`, and `@c15t/scripts`: normalize emitted `dist-types` imports during builds so published declarations no longer reference sibling `.d.ts` files directly, which could break consumers on newer TypeScript versions.
  - Tooling: make declaration normalization discover package targets dynamically so the compatibility fix applies consistently across published packages instead of only a hardcoded subset.

- 05db767: Align the styled package install path around app-level CSS entrypoints instead of JS-side stylesheet imports.

  - `@c15t/react`: update the published README guidance, quickstart docs, and stylesheet usage comments so styled and IAB installs consistently import `@c15t/react/styles.css` or `styles.tw3.css` from a global CSS file, with explicit guidance on why this avoids layer-order debugging problems.
  - `@c15t/nextjs`: update the published README guidance, quickstart docs, and stylesheet usage comments so styled and IAB installs consistently import `@c15t/nextjs/styles.css` or `styles.tw3.css` from `app/globals.css`, with explicit guidance on why this avoids layer-order debugging problems.
  - `@c15t/cli`: move the stylesheet codemod and scaffold behavior to mutate global CSS entrypoints, remove old JS-side stylesheet imports, share the CSS-entrypoint mutation logic between generate and codemod flows, and add regression coverage for Tailwind v3/v4, IAB, dry-run, and missing-CSS cases.

- Updated dependencies [3d5b0fd]
- Updated dependencies [918a70e]
- Updated dependencies [ad019de]
  - @c15t/backend@2.0.0-rc.8
  - @c15t/logger@1.0.2-rc.1

## 2.0.0-rc.6

### Patch Changes

- 5c8ee05: feat(styles): ship explicit stylesheet entrypoints for prebuilt UI

  - Publish explicit `styles.css` and `iab/styles.css` entrypoints for prebuilt UI in `@c15t/ui`, `@c15t/react`, and `@c15t/nextjs`
  - Update docs and CLI setup so stylesheet imports and Tailwind host-app configuration are explicit
  - Support the documented Tailwind 3 and Tailwind 4 layering model without requiring `!important`
  - Add automated first-paint CDP benchmark (`benchmarks/vite-react-repro/scripts/run-first-paint-bench.ts`)

  **Bundle impact (vite-react-repro):**

  - JS: 435.5 KB → 361.0 KB (-74.5 KB raw, -13.4 KB gzip / -11%)
  - CSS: 0.8 KB → 49.2 KB (moved from JS to CSS — net gzip saving: -6.5 KB / -5%)
  - `createElement("style")` runtime calls: eliminated
  - JS heap: -143 KB (-8%)

  **Main-thread impact (6x CPU throttle, 3 runs × 60 samples):**

  - JS evaluation: 64.5 ms → 53.1 ms (-11.4 ms / -17.7%)
  - Total → first paint: 87.8 ms → 76.5 ms (-11.3 ms / -12.9%)

- Updated dependencies [bb3ab0f]
- Updated dependencies [1a724fc]
  - @c15t/backend@2.0.0-rc.6

## 2.0.0-rc.5

### Patch Changes

- 021ac99: Bundle version-matched docs inside published c15t packages under `docs/**` for local agent and developer reference.

  Remove CLI `AGENTS.md` generation. Use the bundled package docs directly alongside c15t agent skills.

- 57eef9f: feat(cli): inth.com integration
  feat(cli): remove redundent preflight checks
- 58fb392: Rename translation-facing APIs from `translations` to `i18n` across runtime types and helpers.
  Add CLI migration codemods to update existing projects to the new naming.
- 1c1b2d8: feat(cli): add more codemods for v1 -> v2
- e79f840: Separate published declaration files from runtime bundles to improve Vite compatibility

  - Move generated `.d.ts` files out of `dist/` into `dist-types/` across published packages
  - Stop emitting declaration maps in shared TypeScript config so `.d.ts.map` files are no longer published
  - Emit declarations only once per package to avoid unstable output when both `esm` and `cjs` builds write types
  - Update package `types` metadata, publish file lists, Turbo outputs, and publish artifact checks for the new layout
  - Verify the package layout works in Vite 7 without `optimizeDeps.exclude` workarounds for `c15t` and `@c15t/react`

- 58fb392: Rename `c15t` mode references to `hosted` in core runtime and CLI generate flows.
  Add migration codemods and template updates for the hosted vs offline terminology.
- Updated dependencies [021ac99]
- Updated dependencies [cfe1b2e]
- Updated dependencies [e79f840]
- Updated dependencies [372cf92]
  - @c15t/backend@2.0.0-rc.5
  - @c15t/logger@1.0.2-rc.0

## Unreleased

- Bundle version-matched c15t docs in the published packages under `docs/**` for local developer and agent reference. Use the bundled docs directly together with c15t agent skills.

## 2.0.0-rc.4

### Patch Changes

- Updated dependencies [4c8435c]
  - @c15t/backend@2.0.0-rc.4

## 2.0.0-rc.3

### Patch Changes

- Updated dependencies [0a18fb6]
  - @c15t/backend@2.0.0-rc.3

## 2.0.0-rc.2

### Patch Changes

- 732d44f: feat(dev-tools): add DevTools export
  feat(cli): add support for file structures like [locale]
  feat(cli): add c15t/skills
- Updated dependencies [408df0e]
  - @c15t/backend@2.0.0-rc.2

## 2.0.0-rc.1

### Patch Changes

- 0bc4f86: fixed workspace resolving
- Updated dependencies [0bc4f86]
  - @c15t/backend@2.0.0-rc.1
  - @c15t/logger@2.0.0-rc.1

## 2.0.0-rc.0

### Major Changes

- 126a78b: https://c15t.com/changelog/2.0.0-rc.0

### Patch Changes

- Updated dependencies [126a78b]
  - @c15t/backend@2.0.0-rc.0
  - @c15t/logger@2.0.0-rc.0

## 1.8.3

### Patch Changes

- Updated dependencies [6c28663]
  - @c15t/react@1.8.3

## 1.8.3-canary-20260109181827

### Patch Changes

- @c15t/react@1.8.3-canary-20260109181827

## 1.8.3-canary-20251222100111

### Patch Changes

- @c15t/react@1.8.3-canary-20251222100111

## 1.8.3-canary-20251218133143

### Patch Changes

- Updated dependencies [226f45c]
  - @c15t/react@1.8.3-canary-20251218133143

## 1.8.2

### Patch Changes

- 2ce4d5a: \* feat(core): Added ability to disable c15t with the `enabled` prop. c15t will grant all consents by default when disabled as well as loading all scripts by default. Useful for when you want to disable consent handling but still allow the integration code to be in place.

  - fix(react): Frame component CSS overriding
  - fix(react): Legal links using the asChild slot causing multi-child error

  https://c15t.com/changelog/1.8.2

- Updated dependencies [2ce4d5a]
  - @c15t/react@1.8.2

## 1.8.2-canary-20251212163241

### Patch Changes

- @c15t/react@1.8.2-canary-20251212163241

## 1.8.2-canary-20251212112113

### Patch Changes

- Updated dependencies [7284b23]
- Updated dependencies [dfd5e4f]
  - @c15t/react@1.8.2-canary-20251212112113

## 1.8.2-canary-20251210222051

### Patch Changes

- Updated dependencies [a03d607]
  - @c15t/react@1.8.2-canary-20251210222051

## 1.8.2-canary-20251210105424

### Patch Changes

- Updated dependencies [3eb3f4a]
  - @c15t/react@1.8.2-canary-20251210105424

## 1.8.1

### Patch Changes

- @c15t/react@1.8.1

## 1.8.0

### Patch Changes

- Updated dependencies [68a7324]
  - @c15t/backend@1.8.0
  - @c15t/react@1.8.0
  - @c15t/logger@1.0.1

## 1.8.0-canary-20251112105612

### Patch Changes

- 6e3034c: refactor: update rslib to latest version
- Updated dependencies [31953f4]
- Updated dependencies [7043a2e]
- Updated dependencies [6e3034c]
- Updated dependencies [bee7789]
- Updated dependencies [69d6680]
  - @c15t/react@1.8.0-canary-20251112105612
  - @c15t/backend@1.8.0-canary-20251112105612
  - @c15t/logger@1.0.1-canary-20251112105612

## 1.8.0-canary-20251028143243

### Patch Changes

- 2b2605b: feat(cli): save migrations to a .sql file instead of in the console
- 3e780eb: feat(cli): add bun support
  feat(cli): add install @c15t/scripts prompt
  fix(cli): default log level to info
  fix(cli): create consent manager component in components directory (pages)
- 8f3f146: chore: update various dependancies
- 2ad1ff3: fix(nextjs): missing InitialDataPromise type export for pages
- Updated dependencies [067c7af]
- Updated dependencies [8f3f146]
- Updated dependencies [a0fab48]
  - @c15t/react@1.8.0-canary-20251028143243
  - @c15t/backend@1.8.0-canary-20251028143243

## 1.7.0

### Minor Changes

- aa16d03: You can find the full changelog at https://c15t.com/changelog/1.7.0

### Patch Changes

- Updated dependencies [aa16d03]
  - @c15t/logger@1.0.0
  - @c15t/react@1.7.0
  - @c15t/backend@1.7.0

## 1.7.0-canary-20251014174050

### Patch Changes

- Updated dependencies [87ce89f]
  - @c15t/react@1.7.0-canary-20251014174050

## 1.7.0-canary-20251012181938

### Patch Changes

- b27bd8f: feat(cli): improve react component pattern
- c6518dd: refactor: added @c15t/logger package
- e9a4a50: fix: correct spelling of "GitHub" in CLI commands
- Updated dependencies [c6518dd]
- Updated dependencies [0c80bed]
- Updated dependencies [a58909c]
- Updated dependencies [9f4ef95]
  - @c15t/backend@1.7.0-canary-20251012181938
  - @c15t/logger@1.0.0-canary-20251012181938
  - @c15t/react@1.7.0-canary-20251012181938

## 1.6.1

### Patch Changes

- Updated dependencies [6257a20]
  - @c15t/react@1.6.1

## 1.6.0

### Minor Changes

- 84ab0c7: For a full detailed changelog see the [v1.6.0 release notes](https://c15t.com/changelog/1.6.0).

### Patch Changes

- Updated dependencies [84ab0c7]
  - @c15t/backend@1.6.0
  - @c15t/react@1.6.0
