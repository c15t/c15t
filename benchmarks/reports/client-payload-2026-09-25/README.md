# Client payload attribution, v2 against v3 alpha.2

On the c15t docs site, initial route JavaScript grew from 748,306 to 770,336 B
gzip (+22,030) and CSS from 72,569 to 85,514 B (+12,945) between c15t 2.2.1 and
3.0.0-alpha.2. That comparison also includes unrelated site changes. This report
measures the same thing in one Next.js consumer where only the consent setup
changes, and attributes the bytes to packages and modules.

## Setup

One Next.js 16.3.4 App Router app (React 19.2.8, Tailwind CSS 4.3.3), built with
`next build` (Turbopack), served with `next start`. Every arm has the same two
routes (`/` and `/docs`), the same page content and Tailwind stylesheet, and the
docs site's custom color theme. Arms install c15t from npm or packed tarballs
into their own directory outside the workspace.

| Arm | Consent setup |
| --- | --- |
| `baseline` | None |
| `v2` | `@c15t/nextjs` 2.2.1, the v2 Next.js quickstart: client `ConsentManagerProvider` in hosted mode, `ConsentBanner`, `ConsentDialog`, `ConsentDialogLink`, `@import '@c15t/nextjs/styles.css'` |
| `v3` | `c15t/next`, the v3 App Router guide: `resolveConsent` awaited in `Suspense`, `ConsentRoot` with `defineConsentConfig({ backendURL, manifestURL })`, `ConsentBanner`, deferred `ConsentDialog`, `ConsentDialogLink`, `@import 'c15t/next/styles.css'` |
| `v3-react` | The docs site's shape: `ConsentProvider` from the `c15t/react` umbrella in `hosted()` mode, fed the same server-resolved state, `@import 'c15t/react/styles.css'` |
| `v3-split` | `v3-react` imported from the split `c15t/react/provider`, `/consent-banner`, `/consent-dialog` and `/consent-dialog-link` entries |

v3 builds: packed from `origin/v3` at `40032552c` (alpha.2, "before") and from
`0e19035aa` (this branch, "after"). v2 and baseline are the same in both runs.

For each arm and route, Chromium records every `/_next/static` script and
stylesheet in three phases, each from a fresh browser context: initial load,
opening the dialog from the banner's Customize button, and accepting from the
banner. Sizes come from the emitted files with the `sourceMappingURL` comment
removed; gzip uses Node's zlib defaults per file, without response headers.

Turbopack emits no module stats, so bytes are attributed with
`productionBrowserSourceMaps`: each mapping segment owns the generated text up
to the next segment, and each source path is mapped to its `node_modules`
package. Package gzip is the package's share of a chunk's raw bytes times the
chunk's gzip size, so it is an estimate. A v3 build without source maps emitted
the same 30 files within 667 B in total (0.05%); the differences are module
order inside chunks.

Sizes are deterministic. Two separate builds of the alpha.2 arms produced
identical bytes, and the `v3-react` arm, which the fix does not touch, is
byte-identical before and after. `/` and `/docs` load the same assets in every
arm, so the tables show `/`.

## Initial load

| Arm | Initial JS gzip | Initial CSS gzip | JS over baseline | CSS over baseline | JS+CSS over baseline |
| --- | ---: | ---: | ---: | ---: | ---: |
| baseline | 137,283 | 2,044 | – | – | – |
| v2 | 183,153 | 12,380 | +45,870 | +10,336 | +56,206 |
| v3, alpha.2 | 208,737 | 24,617 | +71,454 | +22,573 | +94,027 |
| v3, this branch | 205,177 | 24,617 | +67,894 | +22,573 | +90,467 |
| v3-react | 202,097 | 24,617 | +64,814 | +22,573 | +87,387 |
| v3-split | 207,500 | 30,546 | +70,217 | +28,502 | +98,719 |

The site-shaped arm (`v3-react`) against `v2` adds 18,944 B of JS gzip and
12,237 B of CSS gzip. The site measured +22,030 and +12,945, so c15t accounts
for most of the site's growth, not all of it. The documented `v3` arm on this
branch adds 22,024 B of JS gzip over `v2`.

## Where the JS goes (initial, raw / est. gzip)

| Package | v2 | v3, alpha.2 | v3, this branch |
| --- | ---: | ---: | ---: |
| `c15t` (v2 core, one bundled file) | 66,174 / 20,431 | – | – |
| `@c15t/core` | – | 107,227 / 34,167 | 107,342 / 33,675 |
| `@c15t/schema` | 12,783 / 3,947 | 38,606 / 11,981 | 29,693 / 9,225 |
| `@c15t/react` | 44,282 / 13,672 | 55,170 / 17,787 | 54,842 / 17,484 |
| `@c15t/ui` | 16,292 / 5,030 | 10,605 / 3,432 | 10,605 / 3,393 |
| `@c15t/translations` (English only) | 6,499 / 2,007 | 6,494 / 2,187 | 6,494 / 2,187 |
| `@c15t/nextjs` | – | 2,519 / 779 | 2,715 / 821 |
| `zustand` | 317 / 98 | – | – |

v2 ships the dialog, widget and floating trigger in the initial bundle; v3
defers them. The growth is in the consent engine. On this branch, v3's initial
c15t JS by area, raw / est. gzip:

| Area | Bytes |
| --- | ---: |
| `@c15t/core/kernel` (commands, snapshot, patch, pending saves, records) | 38,790 / 11,729 |
| `@c15t/schema/shared` (policy rules, resolution, fingerprints) | 29,693 / 9,225 |
| `@c15t/core/modules/persistence` (record codec, storage) | 21,257 / 6,428 |
| `@c15t/react` provider, draft, hooks | 21,350 / 6,769 |
| `@c15t/core/libs` (vendors, policy actions, cookies) | 15,384 / 5,004 |
| `@c15t/react` banner | 13,525 / 4,090 |
| `@c15t/core/transports` (hosted client, init output, subject body) | 12,963 / 3,989 |
| `@c15t/react` shared components | 12,907 / 4,353 |
| `@c15t/core/consent-record` | 10,677 / 3,376 |
| `@c15t/ui/theme` | 5,625 / 1,701 |
| `@c15t/core/modules/iframe-blocker` | 3,488 / 1,482 |

`before.json` and `after.json` list every module; render the full tables with
`--render` (see below).

## SDK cause fixed here: offline presets in every ConsentRoot bundle

`ConsentRoot` picks its transport at runtime and imported `offline()`
statically. Offline mode's default rules pulled `policy-rule-presets.js`
(6,357 B), `legacy-preset-material.js` (1,270 B), `policy-runtime.js`
(1,229 B) and the offline transport (343 B) into the initial bundle of every
app that renders the root, including this setup, where a backend URL is set and
offline mode never runs. The branch loads offline mode with a dynamic import on
first init, as the root already does for the manifest transport.

| `v3` arm, initial JS | alpha.2 | This branch | Change |
| --- | ---: | ---: | ---: |
| Raw | 684,020 | 675,071 | −8,949 |
| Gzip | 208,737 | 205,177 | −3,560 |
| Brotli | 179,336 | 176,389 | −2,947 |

`@c15t/tanstack-start`'s `ConsentRoot` had the same static import and gets the
same fix. It was measured separately, outside this bench: a TanStack Start
1.168.49 app (Vite 8.1.3, React 19.2.8) following the TanStack Start quickstart
(`createConsentStateHandler` in the root loader with an inline copy of the same
manifest, `ConsentRoot` with `initRoute={false}`, banner, deferred dialog and
link, `c15t/tanstack-start/styles.css`, the same theme), built with `vite build`
and served from `dist/`. Packages were packed from `40032552c` (alpha.2) and from
this branch. Chromium loaded 5 initial scripts in both builds, sized and
attributed the same way as above. Rolldown minifies these modules less
tightly than Turbopack, so the presets weigh more here (28,628 B raw).

| TanStack Start, initial JS | alpha.2 | This branch | Change |
| --- | ---: | ---: | ---: |
| Raw | 551,334 | 522,938 | −28,396 |
| Gzip | 174,132 | 164,373 | −9,759 |
| Brotli | 148,784 | 140,560 | −8,224 |

Initial CSS (21,720 B gzip) is unchanged. Opening the dialog loads 11,291 B gzip
before and 11,289 B after; accepting loads no extra JS in either build, since this
setup saves through `hosted()`. The presets now sit in an `offline-mode` chunk
that neither build loads.

What `ConsentRoot` still costs over the `v3-react` provider tree: 7,217 B raw,
about 3,080 B gzip. `root.js` and `config.js` are 2,715 B; the rest is `hosted`
with `initURL` options, `custom()`, and related helpers, which runtime mode
selection keeps.

## Deferred loads

| Arm | Dialog open JS gzip | Dialog open CSS gzip | First accept JS raw / gzip |
| --- | ---: | ---: | ---: |
| v2 | 0 (dialog is eager) | 0 | 0 |
| v3 | 10,621 (1 file) | 8,032 (3 files) | 223,418 / 63,837 (1 file) |
| v3-react | 10,621 (1 file) | 8,032 (3 files) | 0 |
| v3-split | 0 (dialog is eager) | 0 | 0 |

In the `v3` arm, the first Accept loads `@c15t/core/transports/manifest`
before it posts to `/subjects`. The chunk is 92% `@c15t/translations/dist/all.js`
(205,565 B raw, every locale), plus `session-report`, `client-ip`,
`manifest-cache-runtime`, `gvl-cache` and `gvl-reference`. `ConsentRoot` routes
saves through its lazy manifest transport, so the save path loads the manifest
resolver even though the server already resolved consent. The `hosted()` arms
save without loading anything. This branch does not change it; see
[follow-ups](#follow-ups).

## Import boundary checks (initial JS)

| Family | v2 | v3 arms |
| --- | --- | --- |
| `@c15t/dev-tools` | none | none |
| `@c15t/iab`, `@iabtechlabtcf/*` | none | none (`@c15t/react/dist/context/iab-context-value.js`, 65 B, is a context default) |
| Server entries (`next/server`, `api`, `middleware`, `proxy`, `node-bridge`) | none | none |
| Manifest resolver and cache | none | none initially; see first accept above |
| Translations other than English | none | none |
| Theme runtime | `@c15t/ui/dist/theme/utils.js` 6,040 B | `@c15t/ui/dist/theme/utils.js` 5,625 B, `theme-provider.js` 165 B |
| Offline presets | none | 9,199 B on alpha.2 in `v3`; none on this branch |

## Umbrella and split entries

`c15t/react` tree-shakes: the `v3-react` and `v3-split` arms carry the same
core, schema and translation modules. The split `c15t/react/consent-dialog`
entry exports the dialog itself, not the deferred wrapper the umbrella's
`ConsentDialog` uses. With split entries, the dialog's JS and CSS load up
front: +5,403 B JS gzip and +5,929 B CSS gzip initially, and nothing on first
open. Opening the dialog, the split arm loads less in total (207,500 + 30,546)
than the umbrella arm (212,718 + 32,649).

## CSS

| Arm | Stylesheets | Initial gzip |
| --- | --- | ---: |
| baseline | app | 2,044 |
| v2 | app (Tailwind + aggregate) | 12,380 |
| v3 | app (Tailwind + aggregate) 18,461, plus 3 component sheets 6,156 | 24,617 |
| v3, first dialog open | 3 more component sheets | +8,032 |

Tailwind inlines the aggregate into the app stylesheet, so its source map
credits it to the app. Against baseline, the v3 aggregate adds 16,417 B gzip
(688 component rules, 112,735 B raw) and the v2 aggregate 10,336 B (390 rules,
55,694 B raw). The six component stylesheets duplicate rules already in the
aggregate: 6,156 B gzip initially and 8,032 B on first dialog open. Deduplicating
them is tracked separately and is not part of this change.

## Reproduce

Build the packages, then run the bench from the repo root. It builds the arms
one at a time.

```sh
bun turbo run build --filter=c15t... --filter=@c15t/dev-tools --filter=@c15t/iab
bunx tsx benchmarks/bundle-test-app/client-payload/run.ts --v3 workspace \
  --work-dir /tmp/c15t-client-payload --output-dir /tmp/c15t-client-payload-out
```

`--v3 tarballs:<dir>` installs existing packs (`c15t.tgz`, `c15t-react.tgz`, ...)
and `--v3 npm:<version>` a published version. `--arms v2,v3` limits the arms,
`--skip-build` re-measures existing builds, and
`--render benchmarks/reports/client-payload-2026-09-25/after.json` prints the
full Markdown for a saved run, including every module.

## Limitations

- One app, one theme, Tailwind 4, no consent-gated scripts. The docs site also
  loads `@c15t/scripts` integrations, which no arm here includes.
- Package gzip is a proportional estimate. Chunk gzip totals are exact.
- Transfer sizes exclude HTTP headers and use zlib defaults, not a CDN's
  compression level.
- The mock backend accepts saves. It does not validate decision assertions.

## Follow-ups

- The first-accept chunk in the `ConsentRoot` manifest setup (63,837 B gzip,
  mostly every locale's translations) comes from saving through the manifest
  transport. Routing saves through the hosted client needs a decision on how
  decision inputs are asserted when the server resolved consent.
