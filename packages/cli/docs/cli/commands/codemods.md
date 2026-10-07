---
title: Codemods
description: Migrate source from c15t v2 to v3 with the c15t CLI codemods
  command, covering the provider, transports, moved exports, dev tools, policy
  presets, CSS variables, Tailwind CSS 3, callbacks, the Node.js SDK and backend
  config, and run the v1 to v2 source transforms.
group: cli
---

## Run the v3 codemods

The v3 codemods run only when you name them; `--all` never selects them.
Preview every change first, then run the same command without `--dry-run`:

```bash
npx @c15t/cli@alpha codemods consent-provider-options root-exports-to-subpaths use-consent-manager-to-hooks callbacks-to-v3 policy-packs-to-policy-rules --dry-run --json
```

Name several codemods in one command and they run in the order you give,
each seeing the previous one's edits. Codemods that can't finish a change
leave a `TODO(c15t v3)` comment next to it. Most also leave the v2 code in
place, so type-checking fails at each one until you resolve it.

| ID                             | Rewrites                                                                                                                                                                                                                                                                                                                                                         | Leaves a `TODO(c15t v3)` for                                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `consent-provider-options`     | `ConsentManagerProvider`, `ConsentManagerOptions` and `ConsentManagerProviderProps` to the `ConsentProvider` names; `mode: 'hosted'` with `backendURL`, `headers` and `customFetch` to `mode: hosted({ url, headers, fetch })`; `mode: 'offline'` with `offlinePolicy.policyPacks` to `mode: offline({ policyRules })`; `iframeBlockerConfig` to `iframeBlocker` | `mode: 'custom'` with `endpointHandlers`, `retryConfig`, other `offlinePolicy` keys and hand-written policy packs       |
| `root-exports-to-subpaths`     | Imports of names that left the `c15t/react`, `c15t/next`, `@c15t/react` and `@c15t/nextjs` roots, moved to `/headless`, `/consent-dialog-trigger`, `/types` or `/components/consent-banner`                                                                                                                                                                      | Removed names such as `useConsentScript`, `YouTubeEmbed` and `ConsentButton`                                            |
| `use-consent-manager-to-hooks` | `useConsentManager()` fields to one hook each                                                                                                                                                                                                                                                                                                                    | Fields with no one-call replacement                                                                                     |
| `scripts-to-integrations`      | `@c15t/scripts` imports to `@c15t/integrations`                                                                                                                                                                                                                                                                                                                  | Nothing                                                                                                                 |
| `dev-tools-to-c15t`            | `@c15t/dev-tools/react` and `@c15t/dev-tools/tanstack` imports to `c15t/next/devtools` or `c15t/react/devtools`, and removes the `namespace` prop                                                                                                                                                                                                                | Removed store helpers such as `getC15tStore`                                                                            |
| `policy-packs-to-policy-rules` | `policyPackPresets` to `policyRulePresets` and `worldNoBanner()` to `worldNone()`                                                                                                                                                                                                                                                                                | Nothing                                                                                                                 |
| `css-variables-to-v3`          | `--consent-widget-*` to `--consent-manager-*` and `--frame-*` to `--consent-gate-*`                                                                                                                                                                                                                                                                              | `--consent-widget-accordion-*`                                                                                          |
| `postcss-tailwind3`            | Adds the c15t Tailwind CSS 3 plugin before `tailwindcss` in `postcss.config`                                                                                                                                                                                                                                                                                     | Nothing; prints a warning for configs it can't edit                                                                     |
| `callbacks-to-v3`              | `onConsentChanged` to `onChoiceRecorded`                                                                                                                                                                                                                                                                                                                         | The `onChoiceRecorded` payload, `onConsentSet` and `onBannerFetched`                                                    |
| `theme-to-consent-theme`       | `theme.slots.consentDialogFooter` to `consentWidgetFooter`                                                                                                                                                                                                                                                                                                       | Theme tokens, which need `ConsentTheme` or `generateThemeCSS()`, and `theme.slots.frame`                                |
| `iab-option-to-iab-provider`   | Nothing                                                                                                                                                                                                                                                                                                                                                          | The `iab` provider option, which moves to `IABProvider`                                                                 |
| `node-sdk-to-v3`               | `c15tClient()` and `new C15TClient()` to `createC15tClient()`, client options, method names, type and error names                                                                                                                                                                                                                                                | Each call site, `prefix`, `debug` and dropped retry options                                                             |
| `backend-config-to-v3`         | `policyPacks` (as `policyRules`), `branding`, `customTranslations`, `i18n` and `appName` into `manifest`                                                                                                                                                                                                                                                         | `adapter`, `disableGeoLocation`, `iab`, `cache`, `logger`, `telemetry`, `tablePrefix`, `background` and removed entries |

v2 still accepted the deprecated `translations` option, and v3 removes it.
The v1 to v2 transform `translations-to-i18n` moves it to `i18n`; name it to
run it on a v2 app.

The codemods edit `.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.cts`, `.mjs` and
`.cjs` files. `css-variables-to-v3` also edits `.css`, `.scss`, `.sass` and
`.less` files. None of them edit `package.json`, lockfiles, or `.vue`,
`.svelte` and `.astro` files.

### Provider, transports and options

`consent-provider-options` finds option objects passed to the provider's
`options` prop, variables typed as `ConsentManagerOptions` or
`ConsentProviderOptions`, and objects passed to `getOrCreateConsentRuntime()`
from `c15t`. It adds `hosted` or `offline` to the import the file already
uses for the provider. A hosted mode without `backendURL` gets v2's default,
`hosted({ url: '/api/c15t' })`. A module that re-exports
`ConsentManagerProvider` keeps that name as an alias, so its importers still
resolve.

`callbacks-to-v3`, `theme-to-consent-theme` and `iab-option-to-iab-provider`
read the same option objects. Options built in another file, or spread from
another object, are not found; search for the old keys by hand.

### Moved exports

`root-exports-to-subpaths` keeps the framework you import from where v3 has a
matching entry: `useHeadlessConsentUI` from `c15t/next` moves to
`c15t/next/headless`. Trigger atoms, token types and flat banner parts exist
only on the React entries, so imports of them from `c15t/next` move to
`c15t/react/...`, and from `@c15t/nextjs` to `@c15t/react/...`. Types such as
`AllConsentNames` move to `c15t`, or `@c15t/core` for scoped packages.

`policy-packs-to-policy-rules` moves `policyPackPresets` imports from React
and Next.js entries to `c15t`, or `@c15t/core` for scoped packages, because
the v3 React and Next.js entries don't export presets. Calls to presets need
no other change. Hand-written policy packs use a different format in v3;
`consent-provider-options` and `backend-config-to-v3` flag them.

`dev-tools-to-c15t` picks `c15t/next/devtools` when `package.json` lists
`next` or `@c15t/nextjs`, and `c15t/react/devtools` otherwise. If
`package.json` lists the scoped packages but not `c15t` v3, it uses
`@c15t/nextjs/devtools` or `@c15t/react/devtools`.

### Styles

`css-variables-to-v3` renames only the variables v2 defined, so your own
variables such as `--frame-width` stay as they are. It renames them in
stylesheets and in string and template literals, including inline `style`
objects.

`postcss-tailwind3` runs when `package.json` lists `tailwindcss` 3 and c15t.
It adds `'c15t/postcss-tailwind3': {}`, or the
`@c15t/nextjs/postcss-tailwind3` or `@c15t/react/postcss-tailwind3` plugin
when the app uses scoped packages, to an object-form
`postcss.config.{js,cjs,mjs,ts}`. It leaves an array-form config unchanged and
prints a warning; add the plugin by hand as
[Tailwind CSS 3](https://c15t.com/docs/customization/tailwind#set-up-tailwind-css-3) shows.

### Node.js SDK and backend

`node-sdk-to-v3` follows clients created in the same file, including class
properties and parameters typed as `C15TClient`. It turns `type: 'a,b'`
strings into `types: ['a', 'b']`, and moves a v2 `init(options)` argument to
`init(undefined, options)`. A file that receives the client from another
module keeps its old method names; search for them by hand.

`backend-config-to-v3` reads objects passed to `defineConfig()` or
`c15tInstance()` from `@c15t/backend`, and variables typed as `C15TOptions`.
It merges the moved keys into an existing `manifest` object, and rewrites
imports from the removed `@c15t/backend/define-config` entry.

## Migrate `useConsentManager()` to v3 hooks

v3 removed `useConsentManager()`. The `use-consent-manager-to-hooks` codemod
replaces each destructured field with the hook that reads it:

```bash
npx @c15t/cli@alpha codemods use-consent-manager-to-hooks --dry-run --json
```

Review the before and after contents in the JSON result, then run the same
command without `--dry-run` to write the files.

The codemod reads imports from `c15t/react`, `c15t/next`,
`c15t/tanstack-start`, `@c15t/react`, `@c15t/nextjs`, `@c15t/tanstack-start`
and their `/headless` entries. For each `useConsentManager()` destructuring, it:

* Replaces fields that map to one hook, such as `activeUI` with
  `useActiveUI() ?? 'none'`.
* Turns `has('marketing')` calls with a literal category into
  `useConsent('marketing')`.
* Turns `saveConsents('all')`, `saveConsents('necessary')` and
  `saveConsents('custom')` into `saveCustomPreferences('all')`,
  `saveCustomPreferences('none')` and `saveCustomPreferences()` from
  `useHeadlessConsentUI()`.
* Moves draft fields such as `selectedConsents` and `setSelectedConsent` to
  `useConsentDraft()`, and adds a `TODO(c15t v3)` comment where components now
  need a shared `ConsentDraftProvider`.
* Leaves fields it cannot rewrite on a `useConsentManager()` call under a
  `TODO(c15t v3)` comment that names the replacement. The import no longer
  exists, so the build fails at each place that needs manual work.

The [v3 migration guide](../../upgrade-v3.md#replace-useconsentmanager) maps every
field.

## Rename `@c15t/scripts` imports

v3 renames the vendor package `@c15t/scripts` to `@c15t/integrations`. The
`scripts-to-integrations` codemod rewrites imports and re-exports in
JavaScript and TypeScript files, including literal dynamic imports, `require()`
calls, `require` functions made with Node's `createRequire()`, and import
types. It scans `.mts`, `.cts`, `.mjs` and `.cjs` files too:

```bash
npx @c15t/cli@alpha codemods scripts-to-integrations --dry-run --json
```

It does not edit `package.json`, lockfiles, or imports inside `.vue`, `.svelte`
or `.astro` files. Update those by hand, as the
[package migration](../../upgrade-v3.md#rename-the-integrations-dependency)
describes.

## Run the v1 to v2 transforms

The other transforms migrate v1 source to the v2 API. Run them before you
upgrade a v1 app to v3.

```bash
npx @c15t/cli@alpha codemods --list --json
npx @c15t/cli@alpha codemods --all --from 1.9.0 --to 2.0.0 --dry-run --json
```

| ID                                    | Change                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| `active-ui-api`                       | `showPopup` and `isPrivacyDialogOpen` to `activeUI`                               |
| `component-renames`                   | `CookieBanner`, `ConsentManagerDialog` and `ConsentManagerWidget` to the v2 names |
| `gdpr-types-to-consent-categories`    | `gdprTypes` and `initialGDPRTypes` to `consentCategories`                         |
| `ignore-geo-location-to-overrides`    | `ignoreGeoLocation` to `overrides` with `country: 'DE'`                           |
| `mode-c15t-to-hosted`                 | `mode: 'c15t'` to `mode: 'hosted'`                                                |
| `react-options-to-top-level`          | `react.theme`, `colorScheme` and `disableAnimation` to top-level options          |
| `tracking-blocker-to-network-blocker` | Tracking blocker configuration to network blocker rules                           |
| `translations-to-i18n`                | `translations` to the v2 `i18n` shape                                             |
| `add-stylesheet-imports`              | Styled c15t imports moved into the app's CSS entry point                          |

`--all` picks the transforms that apply to the version you start from. Without
`--from`, it reads the `c15t` or framework package version declared in
`package.json`. If you already upgraded the dependency but the source still
uses v1, pass the old version with `--from 1.9.0` or name the transforms. v2
prereleases such as `2.0.0-rc.4` count as v2, so `--all` skips every v1
transform for them.

Component renames follow imported symbols and keep local aliases. The hosted
mode rename only changes options passed to a c15t API it can identify, so check
custom wrappers by hand.

## Review before writing

`--dry-run` reports each file's original and proposed contents in JSON. The
stylesheet transform reports paths and a summary instead. Transforms in one run
share a parser, so later transforms see earlier proposed changes.

The command fails if a transform reports file errors. Writing is not a single
transaction across transforms. If a later transform fails, earlier ones may
already have saved files, so review the working tree before running again.
