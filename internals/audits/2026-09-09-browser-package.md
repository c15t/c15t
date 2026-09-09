# Browser package audit

PR [#1086](https://github.com/c15t/c15t/pull/1086), rebased onto `origin/v3` at `9168d23d7`.

The implementation reuses the consent runtime, policy resolver, permission evaluator, translations, theme system, and component CSS. The optional IAB entry now provides the existing CMP and an imperative preference UI. Full React parity still needs a reusable public draft API and shared visual scenario coverage.

## Package name

Keep `@c15t/browser`. It covers both classic script tags and ESM used by vanilla JavaScript applications. `@c15t/cdn` would describe delivery rather than the API, and `@c15t/vanilla` would be less explicit about where it runs. Keep `@c15t/core` as the headless engine and `@c15t/browser/headless` as the browser lifecycle and page-hook adapter.

The package should remain separate from the `c15t` umbrella until the other v3 adapters have an agreed umbrella export policy. That omission is a distribution gap, not an error in consent handling.

## Errors corrected during the audit

| Finding | Consequence | Correction |
| --- | --- | --- |
| The adapter used removed v3 snapshot fields, policy packs, and UI helpers. | The rebased package had 64 declaration errors and could not build. | Migrated to `policyRules`, explicit receipts, effective permissions, and the shared presentation resolver. |
| Category gates used the old `consents` projection. | Gates could not follow the new permission and restriction contract. | Use `evaluateConsent`, the same evaluator as the runtime's blockers. |
| The stock banner only rendered opt-in models. | Opt-out choice and notice prompts had no usable first layer. | Render the requested prompt, use notice copy, and call `dismissNotice` without recording a choice. |
| Preference Save submitted only touched toggles. | Untouched displayed preferences were not recorded. | Submit every displayed value, seeded from explicit receipts and presentation or policy defaults. Never seed a choice from masked effective permissions. |
| Actions closed the UI before a save completed and discarded its result. | A failed persistence attempt looked successful. | Return `SaveResult`, report command errors, preserve the surface on failure, and prevent an earlier save from closing explicitly reopened preferences. |
| Automatic initialization applied tag attributes after queued config. | The documented configuration precedence was reversed. | Apply tag attributes first, queued config next, explicit `init` options last. |
| The HTML scanner accepted ordinary script elements. | A category annotation could cause an already executed script to run again. | Activate only `type="text/plain"` elements and watch later insertions. |
| Loading the entry twice created a second client. | CMS duplicate tags could leave duplicate runtimes and UI subscriptions. | Reuse the installed browser API. |
| Focus trapping read only `document.activeElement`. | Tab handling treated focus inside the shadow tree as outside the dialog. | Read through nested shadow roots, preserve native forward Tab, and restore the actual opener. |
| Exit handlers could schedule several removal timers. | An earlier timer could remove a reopened surface. | Schedule one exit and release focus and scroll behavior when exit begins. |
| Light DOM customization was stored in one permanent document style. | Remounting ignored new CSS and disposal left the old styles behind. | Let each mounted host own its stylesheet. |
| Manifest mode only checked for a missing country. | A known country with an unknown state could resolve the wrong regional rule. | Fall back to backend initialization when a region-dependent decision lacks a region. |
| Manifest mode omitted new hosted transport methods. | Identity hydration and persisted privacy directives did not have the hosted transport's behavior. | Forward `loadSubjectRecord` and `recordPrivacyOptOut`. |
| Script ETags used the bundle length. | Different bundles with the same length could share a validator. | Hash both the prelude and the bundle bytes. |
| Examples used obsolete fields and an invalid radius value. | Logs were misleading and the radius override had no effect. | Migrate the examples and use the typed radius token object. |

The rebase also retained the new backend privacy-directive route and DevTools presentation, draft, and record-clearing behavior while adding shadow DOM rendering.

## React parity

| Capability | Browser status |
| --- | --- |
| Consent runtime, storage, explicit receipts, effective permissions, GPC restrictions | Shared core implementation |
| Hosted, offline, custom transport | Supported; offline defaults use the same recommended rules as React |
| Browser-side manifest resolution | Supported, with hosted fallback for missing location |
| Script, iframe, and network gating | Shared runtime modules, plus declarative inert script activation |
| Choice prompts, notice dismissal, preferences | Supported through the current policy contract |
| Prompt variants, positions, blocking, required actions | Shared presentation resolver and CSS |
| Translation overrides, legal links, theme tokens | Supported; only English is bundled by default |
| Floating trigger and DevTools | Supported; DevTools is a separate script entry |
| Snapshot subscription and imperative actions | Supported; signatures are not a copy of `useConsentManager()` |
| Reusable draft state with dirty/stale flags and reset/update helpers | Missing as a public API; the stock widget owns its draft locally |
| React compound components and arbitrary composition | No equivalent stock component API; use the headless entry for custom HTML |
| IAB CMP, `__tcfapi`, TC encoding, vendor/purpose UI | Supported through the separate `@c15t/browser/iab` entry |
| Shared cross-framework scenario and visual parity runner | Browser is not enrolled; it currently has its own Vitest tests and the HTML examples |

Do not claim complete React parity based on shared classes or matching test IDs. The browser package should join the shared scenario runner before making that claim, especially for policy transitions, expired receipts, GPC, partial scopes, and asynchronous draft changes.

## IAB boundary

Do not import `@c15t/iab` from the normal browser entry. There is already a package for the CMP and TC codec; a new package named `@c15t/iab-js` would duplicate its purpose.

The separate `@c15t/browser/iab` entry and `c15t.iab.js` reuse the existing IAB factory on one runtime. Load this script in place of the ordinary entry. It provides purpose, vendor, legitimate-interest, special-feature, and save controls, plus vendor search and incremental rendering. Non-IAB policies use the ordinary surfaces. The backend serves the optional build at `/c15t.iab.js`.

Tests cover GVL loading and failure, queued `__tcfapi` calls, disposal during loading, TC authority, persistence, region changes, withdrawal, individual drafts, and failed saves. IAB-required policies cannot silently save category choices after a vendor-list failure. CMP applicability and display state follow policy and UI changes.

A build plugin checks the normal, headless, and DevTools dependency graphs and rejects imports of the IAB package, codec, or generated stylesheet. The optional script includes the codec without requiring a second script download. ESM consumers use `@c15t/browser/iab`; its dependencies remain shared through their bundler.

This is not a claim of full React visual parity or certification. The DOM adapter uses native disclosures and a paginated vendor list. It needs the shared scenario runner before matching every React interaction and disclosure can be asserted.

## Styling and backend responsibilities

No new backend is needed to change colors or banner design.

- `ui.theme` sets accent, surfaces, typography, radii, and other tokens.
- `ui.css` injects selectors after the bundled CSS inside the default shadow root.
- `ui.shadow: false` lets the page stylesheet reach the markup. Each mount owns and removes its injected stylesheet.
- `presentation.prompt` selects geometry and behavior without changing the policy fingerprint.
- `c15t.headless.js` lets the host own the HTML and CSS completely.

The runnable examples are [stock](../../examples/script-tag/index.html), [custom HTML](../../examples/script-tag/custom.html), [styling](../../examples/script-tag/styled.html), and [IAB](../../examples/script-tag/iab.html). The styling page demonstrates both shadow-root CSS and page CSS through `?shadow=false`.

A future backend editor would store and distribute presentation settings. Rendering them is already a frontend responsibility. CSS isolation also means page selectors cannot directly cross the default shadow boundary; use `ui.css` or light DOM deliberately.

## Remaining limitations

1. The IAB entry requires CMP configuration and a vendor list. Its example uses sample vendor data; deployments must supply their own configuration. Shared visual parity coverage remains outstanding.
2. Custom preference centers own their draft state. They must not confuse effective permissions with an explicit choice. A reusable draft controller shared with React would reduce drift; it needs tests for policy changes and edits made while a save is pending.
3. `consentCategories` filters displayed controls, not the policy scope. Hiding categories that still need a choice can leave the prompt incomplete. The examples now display the whole scope. Narrow the policy itself when only some categories apply.
4. The backend script routes use Node filesystem APIs. `script.bundles` supplies file paths; it does not make the route portable to a filesystem-free runtime. An injected bundle loader or string source would be a separate capability.
5. The stock UI injects inline styles and has no nonce option. A strict style CSP needs a supported integration path before that environment is advertised.
6. The HTML scanner can activate scripts but cannot undo their effects. Use vendor cleanup through the runtime's script lifecycle or reload after withdrawal. The old documentation's automatic-reload promise no longer matches v3.
7. The manifest is cached for the lifetime of the transport. `ready()` waits for successful initialization and does not reject on an initialization failure. Applications should subscribe to errors and plan how to reload or recreate a failed or outdated client.
8. The rebased full and headless builds are approximately 83.9 KB and 56.0 KB gzip; the optional IAB build is 116.3 KB gzip. The old 51 KB and 28 KB figures no longer apply. Measure the policy preset and manifest resolver costs before optimizing; named presets currently retain the preset collection.

## Validation

- Browser regression tests, core, UI, DevTools, backend, React, Svelte, Vue, Astro, and root tooling tests.
- Full repository typechecks, repository lint and formatting, documentation lint, and the browser package's dry-run pack and artifact verification.
- Chromium against the built IIFEs: accept/save, persistence across reload, all displayed custom-HTML categories, computed styles in shadow and light DOM, mobile fit at 390px, forward/reverse keyboard focus wrapping, Escape, and duplicate script loading. No page errors in those flows.
- The normal, headless, and DevTools builds pass the dependency assertion excluding the IAB implementation, codec, and stylesheet.
- IAB browser regressions: 78 total browser tests pass. The package build/test run passes all 40 Turbo tasks with bounded concurrency; root tooling passes 135 tests.
- Chromium against the optional built script: purpose/vendor selection, TC confirmation, reload persistence, a 390px mobile dialog, forward/reverse focus wrapping, Escape focus restoration, and duplicate script loading. No page errors in those flows.

These checks establish the exercised behavior. They do not establish full visual parity or compatibility with every CMS theme and CSP.
