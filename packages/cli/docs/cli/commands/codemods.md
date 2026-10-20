---
title: Codemods
description: Migrate source from c15t v2 to v3 with inth c15t codemods, covering
  package imports, the provider, transports, moved exports, dev tools, policy
  presets, CSS variables, Tailwind CSS 3 and callbacks.
group: cli
---

## Run the v3 codemods

Run the codemods through the Inth CLI. See
[install the Inth CLI](../overview.md#install-the-inth-cli).

Replace `@c15t/react` and `@c15t/nextjs` with `c15t` in `package.json` first.
Until it lists `c15t` v3, `packages-to-c15t` leaves their imports alone, and
the codemods after it see v2 imports. `@c15t/scripts`, `@c15t/backend` and
`@c15t/node-sdk` don't move into `c15t`. The `@c15t/scripts` rename is further
down this page, and the SDK and backend codemods are in
[Upgrade a self-hosted backend](../../self-host/upgrade-v3.md).

The codemods run only when you name them. Preview every change first, then
run the same command without `--dry-run`:

```bash
inth c15t codemods packages-to-c15t consent-provider-options root-exports-to-subpaths use-consent-manager-to-hooks callbacks-to-v3 policy-packs-to-policy-rules --dry-run --json
```

Name several codemods in one command and they run in a fixed order, whatever
order you name them in, each seeing the previous one's edits.
`codemods --list` prints that order. Codemods that can't finish a change
leave a `TODO(c15t v3)` comment next to it. Most also leave the v2 code in
place, so type-checking fails at each one until you resolve it.

| ID                             | Rewrites                                                                                                                                                                                                                                                                        | Leaves a `TODO(c15t v3)` for                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages-to-c15t`             | `@c15t/react` and `@c15t/nextjs` imports to `c15t/react`, `c15t/next` and their subpaths, and removes `styles.css` imports                                                                                                                                                      | Stylesheet imports Tailwind CSS 3 or a cascade layer needs, and `components/integrations` imports                                                           |
| `consent-provider-options`     | `ConsentManagerProvider`, `ConsentManagerOptions` and `ConsentManagerProviderProps` to the `ConsentProvider` names; `mode: 'hosted'` with `backendURL`, `headers` and `customFetch` to `mode: hosted({ backendURL, headers, fetch })`; `iframeBlockerConfig` to `iframeBlocker` | `mode: 'offline'` with `offlinePolicy`, `mode: 'custom'` with `endpointHandlers`, a `mode` set from a variable, `retryConfig` and hand-written policy packs |
| `root-exports-to-subpaths`     | Imports of names that left the `c15t/react`, `c15t/next`, `@c15t/react` and `@c15t/nextjs` roots, moved to `/headless`, `/consent-dialog-trigger`, `/types` or `/components/consent-banner`                                                                                     | Removed names such as `useConsentScript`, `YouTubeEmbed` and `ConsentButton`                                                                                |
| `use-consent-manager-to-hooks` | `useConsentManager()` fields to one hook each                                                                                                                                                                                                                                   | Fields with no one-call replacement                                                                                                                         |
| `scripts-to-integrations`      | `@c15t/scripts` imports to `@c15t/integrations`                                                                                                                                                                                                                                 | Nothing                                                                                                                                                     |
| `dev-tools-to-c15t`            | `@c15t/dev-tools/react` and `@c15t/dev-tools/tanstack` imports to `c15t/next/devtools` or `c15t/react/devtools`, and removes the `namespace` prop                                                                                                                               | Removed store helpers such as `getC15tStore`                                                                                                                |
| `policy-packs-to-policy-rules` | `policyPackPresets` to `policyRulePresets` and `worldNoBanner()` to `worldOptOutNoPrompt()`                                                                                                                                                                                     | Nothing                                                                                                                                                     |
| `css-variables-to-v3`          | `--consent-widget-*` to `--consent-manager-*` and `--frame-*` to `--consent-gate-*`                                                                                                                                                                                             | `--consent-widget-accordion-*`                                                                                                                              |
| `postcss-tailwind3`            | Adds the c15t Tailwind CSS 3 plugin before `tailwindcss` in `postcss.config`                                                                                                                                                                                                    | Nothing; prints a warning for configs it can't edit                                                                                                         |
| `callbacks-to-v3`              | `onConsentChanged` to `onChoiceRecorded`                                                                                                                                                                                                                                        | The `onChoiceRecorded` payload, `onConsentSet` and `onBannerFetched`                                                                                        |
| `theme-to-consent-theme`       | `theme.slots.consentDialogFooter` to `consentWidgetFooter`                                                                                                                                                                                                                      | Theme tokens, which need `ConsentTheme` or `generateThemeCSS()`, and `theme.slots.frame`                                                                    |
| `iab-option-to-iab-provider`   | Nothing                                                                                                                                                                                                                                                                         | The `iab` provider option, which moves to `IABProvider`                                                                                                     |

v2 still accepted the deprecated `translations` option, and v3 removes it.
No codemod moves it; rename it to `i18n` by hand.

The codemods edit `.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.cts`, `.mjs` and
`.cjs` files. `packages-to-c15t` and `css-variables-to-v3` also edit `.css`,
`.scss`, `.sass` and `.less` files. None of them edit `package.json`,
lockfiles, or `.vue`, `.svelte` and `.astro` files.

### Package imports

`packages-to-c15t` runs first, so the other codemods see the `c15t` entries.
It moves `@c15t/react` to `c15t/react` and `@c15t/nextjs` to `c15t/next`,
keeping the subpath: `@c15t/react/headless` becomes `c15t/react/headless`.
When `package.json` lists `next` or `@c15t/nextjs`, the `@c15t/react` root
moves to `c15t/next`, which re-exports the React components and hooks. The
v2 `@c15t/react/cookie-banner` alias becomes
`c15t/react/components/consent-banner`. It rewrites imports, including
`import x = require()`, re-exports, import types, and `import()`, `require()`,
`vi.mock()` and `jest.mock()` calls with a string literal. It leaves
`c15t/react`, `@c15t/integrations` and other packages alone. In a
PostCSS config, it points the `@c15t/react/postcss-tailwind3` and
`@c15t/nextjs/postcss-tailwind3` plugins at `c15t/postcss-tailwind3`, whether
the config names them as a `plugins` object key, computed keys such as
`['@c15t/react/postcss-tailwind3']` included, or in `require()`.

c15t ships ESM only from v3. `require()` loads it only on Node.js 20.19+ or
22.12+, which load ESM through `require()` by default. Each `require()` call
and `import x = require()` the codemod rewrites gets a TODO, and the run lists
every such file with its count. To support older runtimes, convert those files
to `import`, or a PostCSS config to `postcss.config.mjs`. The codemod doesn't
convert CommonJS for you.

It removes `@c15t/react/styles.css` and `@c15t/nextjs/styles.css` imports,
including the `iab/` variants, because v3 components add their own styles. It
reads each stylesheet `@import` whole, so one that spans lines or takes Less
options such as `(css)` is handled too. In Sass it treats `@use` and
`@forward` the same way as `@import`, and a `pkg:` URL such as
`pkg:@c15t/react/styles.css` the same way as the bare one, keeping the
`pkg:` prefix when it rewrites it. In a Sass import that lists several
targets, such as `@import 'theme', '@c15t/react/styles.css';`, it handles
each target on its own and keeps the others. When `package.json` lists
`tailwindcss` 3 in any dependency field, the import is a `.tw3.css` variant, a
stylesheet `@import` has a `layer()`, `supports()` or media condition, or a
Sass `@use` or `@forward` has an `as`, `with()`, `show` or `hide` clause, it
keeps the import, points it at `styles.css` from the `c15t` entry, and leaves a
`TODO(c15t v3)` comment to set `styles: false`. For a `tailwindcss` version
that isn't a semver range, such as a catalog, a `link:`, `file:` or git
specifier, or `latest`, or a range over several majors such as `workspace:*`
or `^3 || ^4`, it reads the installed `tailwindcss`. If it still can't tell
the version, it keeps the import the same way and prints a warning.

If `package.json` lists `@c15t/react` or `@c15t/nextjs` but not `c15t` v3, it
leaves the scoped imports and prints a warning. For a `c15t` version that
isn't a semver range, such as `catalog:`, or a range over several majors, it
reads the installed `c15t`, and keeps the scoped imports when nothing is
installed. While those packages are v2, it
leaves their stylesheet imports and mocks as they are too, since v2 components
don't add their own styles. For a version that isn't a semver range, such as
`catalog:`, it reads the installed package, and treats the package as v2 when
nothing is installed. At v3, it still removes the stylesheet imports.
Replace the packages with `c15t` and run it again.

### Provider, transports and options

`consent-provider-options` finds option objects passed to the provider's
`options` prop, variables typed as `ConsentManagerOptions` or
`ConsentProviderOptions`, and objects passed to `getOrCreateConsentRuntime()`
from `c15t`. It imports `hosted` from the entry the provider comes from. A
provider from `c15t/next` or `c15t/tanstack-start` gets it from `c15t/react`, and one from `@c15t/nextjs` or `@c15t/tanstack-start`
from `@c15t/react`: those framework entries export `hosted()` as plain data
for `defineConsentConfig`, and `ConsentProvider` needs the transport. A
hosted mode without `backendURL` gets v2's default,
`hosted({ backendURL: '/api/c15t' })`. A `mode` set from a variable or expression
gets a `TODO(c15t v3)` comment, unless it already holds a transport such as
`manifest()` or `hosted()`. An offline mode keeps its v2 shape with a
`TODO(c15t v3)` comment; move `offlinePolicy.policyPacks` to
`local({ policyRules })` as
[Move policy packs to policy rules](../../frameworks/react/upgrade-v3.md#move-policy-packs-to-policy-rules) shows. A
module that re-exports
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
With `import * as c15t from 'c15t/react'`, it rewrites `c15t.useColorScheme`
to `useColorScheme` imported from its new entry, and leaves a
`TODO(c15t v3)` comment when that name is already taken. It also marks
`export * from` a framework root, which no longer re-exports the moved names.

`policy-packs-to-policy-rules` moves `policyPackPresets` imports from React
and Next.js entries to `c15t`, or `@c15t/core` for scoped packages, because
the v3 React and Next.js entries don't export presets. Calls to presets need
no other change. Hand-written policy packs use a different format in v3;
`consent-provider-options` flags them.

`dev-tools-to-c15t` picks `c15t/next/devtools` when `package.json` lists
`next` or `@c15t/nextjs`, and `c15t/react/devtools` otherwise. If
`package.json` lists the scoped packages but not `c15t` v3, it uses
`@c15t/nextjs/devtools` or `@c15t/react/devtools`. It reads the `c15t`
version the same way as `packages-to-c15t`.

### Styles

`css-variables-to-v3` renames only the variables v2 defined, so your own
variables such as `--frame-width` stay as they are. It renames them in
stylesheets and in string and template literals, including inline `style`
objects.

`postcss-tailwind3` runs when `package.json` lists `tailwindcss` 3 and c15t.
For a version that isn't a semver range, such as a catalog, a `link:`, `file:`
or git specifier, or `latest`, or a range over several majors such as
`workspace:*` or `^3 || ^4`, it reads the installed `tailwindcss`, and prints a
warning if it still can't tell.
It adds `'c15t/postcss-tailwind3': {}`, or the
`@c15t/nextjs/postcss-tailwind3` or `@c15t/react/postcss-tailwind3` plugin
when the app uses scoped packages without `c15t` v3, to an object-form
`postcss.config.{js,cjs,mjs,ts}`. It leaves an array-form config unchanged.
When the array doesn't list a c15t plugin, it prints a warning; add the plugin
by hand as [Tailwind CSS 3](https://c15t.com/docs/customization/tailwind#set-up-tailwind-css-3)
shows.

### Node.js SDK and backend

A self-hosted backend and the Node.js SDK have their own codemods,
`backend-config-to-v3` and `node-sdk-to-v3`. See
[Upgrade a self-hosted backend](../../self-host/upgrade-v3.md).

## Migrate `useConsentManager()` to v3 hooks

v3 removed `useConsentManager()`. The `use-consent-manager-to-hooks` codemod
replaces each destructured field with the hook that reads it:

```bash
inth c15t codemods use-consent-manager-to-hooks --dry-run --json
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

The [Next.js](../../frameworks/next/upgrade-v3.md#replace-useconsentmanager) and
[React](../../frameworks/react/upgrade-v3.md#replace-useconsentmanager) upgrade
guides map every field.

## Rename `@c15t/scripts` imports

v3 renames the vendor package `@c15t/scripts` to `@c15t/integrations`. The
`scripts-to-integrations` codemod rewrites imports and re-exports in
JavaScript and TypeScript files, including literal dynamic imports, `require()`
calls, `require` functions made with Node's `createRequire()`, and import
types. It scans `.mts`, `.cts`, `.mjs` and `.cjs` files too:

```bash
inth c15t codemods scripts-to-integrations --dry-run --json
```

It does not edit `package.json`, lockfiles, or imports inside `.vue`, `.svelte`
or `.astro` files. Update those by hand, as the upgrade guides for
[Next.js](../../frameworks/next/upgrade-v3.md#rename-the-integrations-dependency),
[React](../../frameworks/react/upgrade-v3.md#rename-the-integrations-dependency)
and [JavaScript](../../frameworks/javascript/upgrade-v3.md#rename-the-integrations-dependency)
describe.

## Review before writing

Add `--dry-run --json` to get each changed file's original and proposed
contents without writing. Codemods in one run see the earlier ones' proposed
changes.

The command stops at the first codemod that fails on a file. Writing is not a
single transaction across codemods, so earlier ones may already have saved
files. Review the working tree before running again.
