---
title: Codemods
description: Rewrite useConsentManager() calls to the c15t v3 hooks, and run the
  v1 to v2 source transforms, with the c15t CLI codemods command.
group: cli
---

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
field. This codemod runs only when you name it; `--all` never selects it.

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
