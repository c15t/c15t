## @c15t/backend@3.0.0-alpha.4 (alpha)

### Count each experiment arm's visitors through `/init`

The backend now learns which arm a visitor runs before they choose, so a dashboard can compute an opt-in rate per arm without any analytics setup. While a visitor has no stored choice, `/init` carries their arm in an `x-c15t-experiment: <id>=<arm>` header, and the backend adds `experiment: { id, arm }` to that request's session report. Manifest-mode renders and init routes put it on the report they send to `POST /sessions`. A visitor who already chose is not counted, because they are not shown the banner.

On a server-rendered page, pass the experiment with the visitor's arm to `resolveConsent({ experiment: { ...bannerShape, arm } })` in `c15t/next`, `@c15t/tanstack-start` and `@c15t/svelte`. The server sends only `{ id, arm }` to the backend, and the returned state carries the experiment to the client, so the provider needs no `experiment` option of its own. A streamed (unawaited) state arrives after the provider mounts, so pass the experiment to the client too; the provider warns in development when you forget. Astro and Nuxt send the arm they rendered on their own. `@c15t/schema` exports `CONSENT_EXPERIMENT_HEADER`, `formatExperimentHeader` and `parseExperimentHeader`, and the session report schema gains an optional `experiment`.

The `choice:recorded` kernel event and `onChoiceRecorded` payload now include `uiSource` and `consentAction`, and `onSurfaceShown` and `onChoiceRecorded` carry the arm, so forwarding experiment events to GTM, PostHog or any other tool is one callback.

Opt-out experiments are measurable too. The `notice:dismissed` kernel event now carries `surface`, `timeToDecisionMs` and `experiment`. The surface is the snapshot's `activeUI`, so a programmatic `dismissNotice()` with no prompt open reports `surface: 'none'` and no timing, the same as a programmatic `save()`.

Dev-tools show the assigned experiment arm and the first impression time of each surface on the Policy tab.

### Rename the remaining `frame` names to `consentGate`

**Breaking.** `ConsentGate` was called `Frame`, and several names still said so. They now say `consentGate`:

- The translations section `frame` is now `consentGate` (`consentGate.title`, `consentGate.actionButton`, `consentGate.policyBlocked`, `consentGate.loading` and `consentGate.error`) in every bundled language, in `CompleteTranslations` and `Translations`, in the `/init` response schema, in `@c15t/backend` responses and in the React Native translation types. `FrameTranslations` is now `ConsentGateTranslations`, and the old name stays as a deprecated alias.
- The stylesheet `@c15t/ui/styles/components/frame` is now `@c15t/ui/styles/components/consent-gate`, and its custom properties are `--consent-gate-*` instead of `--frame-*`.
- The placeholder's test ids are `consent-gate-placeholder` and `consent-gate-button` instead of `frame-placeholder` and `frame-open-dialog`. Its title now has `consent-gate-title`.

Copy under the old key still works. When custom translations, `i18n.messages`, stored copy or an older backend's `/init` response has `frame`, c15t reads it as `consentGate`, with `consentGate` winning key by key when both are set, and logs a warning once outside production. `@c15t/translations` exports the conversion as `migrateLegacyTranslationKeys`. The `frame` stylesheet subpaths stay as deprecated aliases of `consent-gate` for this alpha.

`theme.slots` has a `consentGate` family for the placeholder: `consentGate` for the card, `consentGateTitle` and `consentGateButton`. React, Next.js, TanStack Start, Vue and Svelte apply them. React and Vue also take the same parts as `components['consent-gate'].root`, `.title` and `.button`, and `components` wins where both set an attribute. `consentGateButton` applies on top of `buttonPrimary`.

### One tenant setting, refused when it is unsafe, and recovery for visitors whose subject ID another tenant holds

A self-hosted backend now names its tenant in one place: the instance's `tenantId`. `manifest.tenantId` is removed from the backend configuration. It never scoped a database query, but it did scope policy snapshot tokens when the instance had no `tenantId`, so a config that set only that one issued tokens for a tenant while writing every consent with a null tenant. Built manifests no longer carry it. `ConsentManifest.tenantId` stays on the wire type for other manifest producers.

`c15tInstance` and `createApp` check the tenant when the instance is built. They throw when `tenantId` is empty, padded with whitespace or not a string (a `null` from a JavaScript config used to scope every query to `tenantId = NULL`, which matches nothing), and when the config still sets `manifest.tenantId`, rather than ignoring it. The new `requireTenantId: true` option makes a missing `tenantId` throw too. Set it on every instance that shares a database with other tenants. Without it, an instance whose tenant lookup returned `undefined` starts in the single-tenant scope and writes consents with a null tenant, which the tenant that owns them never reads.

Subject IDs are chosen by the browser and are unique across the whole database. A save naming a subject ID that another tenant holds was answered `400 CONFLICT`, on every save, with no way for the visitor to recover. It is now `409 SUBJECT_CONFLICT`. `@c15t/core` responds by giving the visitor a new subject ID, moving any queued saves to it, and sending the choice once more. Every open tab moves to the same new ID. A consent recorded again with different receipts, purposes or vendor grants is now `409 CONFLICT` instead of `400`. The hosted and manifest transports treat both as permanent refusals, so the kernel no longer replays them from its queue.

### Migration

- Remove `tenantId` from the backend's `manifest` block and set it on the instance. If the instance already sets the same value, delete the manifest one. If it set only `manifest.tenantId`, the instance has been writing rows with a null tenant: setting `tenantId` scopes it to that tenant, and those rows stop appearing in its reads.
- Code that matched `400` with `cause.code: 'CONFLICT'` from `POST /subjects` should expect `409`, and `SUBJECT_CONFLICT` for a subject ID held by another tenant. `PUT /legal-documents` conflicts are still `400 CONFLICT`.
- A manifest built from a config that set `tenantId` gets a new `revision`, so cached manifests refresh once.

### Index experiment attribution and summarise choices per arm

Summarise banner experiments from the backend. Migration `6-experiment-attribution` adds `experimentId`, `experimentArm` and `timeToDecisionMs` columns to `consent`, indexed on `(tenantId, experimentId, experimentArm)`, and `POST /subjects` fills them from `metadata.experiment` and `metadata.timeToDecisionMs` while leaving `metadata` untouched. Values over 128 characters or malformed are dropped rather than failing the save. `GET /experiments/:id/summary` (API key) returns `arms: [{ arm, choices, byAction, bySurface, medianTimeToDecisionMs }]`, choices per arm split by stored `consentAction` (`byAction` always carries `accept_all`, `reject_all`, `opt_out`, `custom` and `unknown`) and `uiSource`, with the median time to decision, filtered by `from`, `to` and `domain`; the response is validated against the new `experimentSummaryOutputSchema` in `@c15t/schema`, and `@c15t/node-sdk` exposes it as `client.experiments.summary(id, { from, to, domain })`. The summary counts choices; the visitors each arm was owed to arrive on the session reports `/init` produces, so an opt-in rate divides the two.

### Support IAB TCF 2.4

c15t now follows TCF 2.4 and TCF Policies v5.0.b. Existing TC strings stay valid.

- The IAB preference centre shows Features in their own section with the IAB standard text and no controls. Special Purposes stay locked.
- `__tcfapi` TC data includes `vendor.disclosedVendors`.
- `isServiceSpecific` is deprecated. TC strings always set IsServiceSpecific=1.
- Vendors that declare only Special Purposes no longer get a legitimate interest bit.
- GVL schemas keep unknown fields, so `standardTexts` survives the backend cache.

### Migration

Headless IAB UIs: `resolveIABDialogDisplayModel` now returns Features in `featureRows` instead of `essentialRows`. Render them without a control, under `featuresStandardText` or your `features.description` translation when it is `null`.

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

### Run the backend on Effect 4.0.0

`@c15t/backend` now depends on the stable `effect@4.0.0` instead of `4.0.0-beta.102`. Its database driver peers moved to match, so install `@effect/sql-pg`, `@effect/sql-mysql2` or `@effect/sql-sqlite-node` at `4.0.0`. A beta driver no longer satisfies the peer range. If you pass your own `SqlClient` layer, import from `effect/sql` instead of `effect/unstable/sql`.

`@effect/sql-pg` 4.0.0 replaces the `pg` package with its own PostgreSQL client and caches named prepared statements by default. Direct connections need no change. Behind a pooler in transaction mode, such as PgBouncer or a provider's pooled URL, queries can fail because the next connection never prepared the statement. Pass `PgClient.layer({ url, prepare: false })` as `database`; the [database setup guide](https://c15t.com/docs/self-host/guides/database-setup) shows the full config.

## @c15t/backend@3.0.0-alpha.3 (alpha)

### Encode and enforce IAB publisher restrictions

Configure TCF publisher restrictions with `publisherRestrictions` on `createIAB`, `IABProvider`, the runtime's `iab` options or the Astro integration's `iab` options. c15t writes them into the TC string's `PubRestrictions` section, decodes them from stored strings, and reports them through `__tcfapi('getTCData')` as `publisher.restrictions`. Previously that map was always empty and configured restrictions were not encoded.

Consent-gated scripts, network rules and iframes with a `vendorId` now apply the confirmed restrictions: type 0 blocks the purpose, type 1 requires consent and type 2 requires legitimate interest for purposes the vendor list marks as flexible. Accept all grants the vendor signal a restriction needs. Legitimate interest a restriction introduces applies until the visitor objects, so Save Settings encodes it as allowed, matching what the preference centres show.

The React, Vue, Svelte and `@c15t/browser/iab` preference centres list each vendor under the legal basis the restrictions leave it, so a vendor moved to legitimate interest gets an objection control instead of a consent toggle. A purpose whose vendors all use legitimate interest shows no consent switch, only the objection, and display-model rows report this as `hasConsentBasis`. Such a purpose no longer decides its c15t category, so a granular save no longer records a denial that blocks its legitimate-interest vendors; legitimate interest never grants a category on its own. Custom UIs can use `applyPublisherRestrictionsToGVL` from `@c15t/iab/headless` or pass `publisherRestrictions` to `processGVLForDialog`.

IAB gates no longer let a refused c15t category block a target that uses only legitimate interest after publisher restrictions. Such a target needs no consent under TCF, so its purpose and vendor legitimate interest signals, and the visitor's objection, decide. Previously every restriction on a referenced category blocked IAB targets; GPC, opt-out directives and strict scope still do, and the refused category still blocks scripts that name only the category or declare a consent purpose.

Unsupported restrictions throw `PublisherRestrictionError` instead of being dropped. This covers reserved type 3, vendors or purposes missing from the vendor list, legitimate interest for purposes 1 and 3 to 6, basis changes on purposes the vendor does not declare as flexible, conflicting types for one vendor, and restrictions in a string that is not service-specific. `whenReady()`, `save()` and `generateTCString()` reject, and no TC string is written. Retrying `whenReady()` does not fetch another vendor list. With an explicit `gvl`, the error lasts for the handle and saving keeps failing even if the kernel later holds a different list; a CMP following the kernel's list checks a replacement list again. When a replacement vendor list makes a restriction unsupported, the TC authority confirmed under the previous list is cleared. Whenever the CMP withdraws its own authority, including on expiry, it also removes the `euconsent-v2` cookie and localStorage entry. A stored TC string whose restrictions differ from the configuration is not restored; the banner opens again for a returning visitor and closes once they save, IAB gates stay denied until then, and the superseded `euconsent-v2` cookie and localStorage entry are removed. Decoding a string written under TCF policy version 2 or 3 accepts legitimate interest required for purposes 3 to 6, which those versions allowed.

### Record consent saves replayed after the policy token expired

A save that fails in the browser is queued and replayed on the next page load or when the browser comes back online, for up to 7 days, with the original click time and policy snapshot token. The self-hosted backend's tokens expire after 30 minutes, so a replay after that was refused with `409 POLICY_SNAPSHOT_INVALID` and the choice stayed in the browser only. The queue then retried it until its 10 attempts ran out.

The backend now records a late save when the token was valid at the save's `givenAt`: the signature, issuer and tenant audience verify, `givenAt` is within the token's lifetime (with 10 minutes of slack for the visitor's clock), the request arrives within `policySnapshot.replayWindowSeconds` of expiry (default 7 days; `0` turns it off), and the manifest still has the policy the token names under the same fingerprint. The record keeps `givenAt` as sent and gets `runtimePolicySource: 'snapshot_token_replayed'`. Saves that arrive while their token is valid are unchanged.

Refusals are now specific. A choice made after the token expired, or a replay after the window, is `409 POLICY_SNAPSHOT_EXPIRED`. A token naming a policy that has since changed is `422 STALE_POLICY` with reason `policy-changed`, live or late, so a choice is never recorded against a policy the visitor didn't see. A token that doesn't verify is still `409 POLICY_SNAPSHOT_INVALID`.

`@c15t/core`'s hosted and manifest transports throw a `ConsentSaveRejectedError` for these refusals, and the kernel drops the save instead of queueing or retrying it. The choice stays recorded in the browser. Queued older saves for the same categories are dropped too, so a grant queued while offline can't replay after the visitor's newer choice was refused. `save:replayed` events carry the backend's code in `rejected`. A custom transport can throw `ConsentSaveRejectedError` to get the same behaviour; `isConsentSaveRejection()` checks for one. Both are exported from `@c15t/core` and `@c15t/core/transports`.

### Migration

- Code that reads consent records and switches on `runtimePolicySource` should handle `snapshot_token_replayed`.
- Code that matched `409 POLICY_SNAPSHOT_INVALID` from `POST /subjects` should also expect `409 POLICY_SNAPSHOT_EXPIRED` and `422 STALE_POLICY` with reason `policy-changed`.
- To keep refusing every save that arrives after its token expired, set `policySnapshot.replayWindowSeconds: 0`.

## @c15t/backend@3.0.0-alpha.2 (alpha)

### Fix declaration imports for Node16 and NodeNext

Fix declaration imports for TypeScript consumers using Node16 or NodeNext resolution. Preserve explicit JavaScript filenames so exported APIs retain their types without requiring `skipLibCheck`.

### Session reports from manifest mode

A host that resolves init from a cached manifest never calls `/init`, so the backend could not count the visitors it served. Every server-side resolution now sends `POST /sessions` to the backend after the fact, server-to-server and detached from the response: the Next.js, TanStack Start, SvelteKit, Nuxt and Astro init routes, and the Next.js, TanStack Start and Astro render-time prefetches. The report carries the manifest revision, the matched policy, the jurisdiction, country, region, language and GPC signal. The visitor's user agent travels as `User-Agent` and the visitor's single client address on a dedicated `X-C15T-Client-IP` header, which the backend masks and records under its `ipAddress` settings; the forwarding chain itself is not sent, and neither are cookies. The browser makes no request.

`@c15t/backend` adds the `POST /sessions` route and a `sessions.onReport` option. Reports are written to the request's wide event and handed to the sink; nothing is stored. The backend's own `/init` emits the same event, so one sink sees hosted and manifest traffic alike.

Reports are handed to the same `onBackgroundRevalidate` hook as a background manifest refresh, so a host that already passes `after` or a platform `waitUntil` needs no change. `resolveConsent` in `@c15t/nextjs/server` gains `waitUntil` for the App Router. Set `reportSessions: false` on any adapter to send none. `createManifestTransport` in `@c15t/core` gains a `report` option; `@c15t/schema` adds `consentSessionReportSchema` and `buildConsentSessionReport`.

### Granular consent

Grant a category and still turn one vendor off, outside IAB TCF. Declare vendors with the `vendors` option or the backend manifest, then name them with `vendor` on scripts and network rules and `data-vendor` on iframes. A target loads when its category passes and its vendor is not off; `alwaysLoad` scripts see the result in their callbacks.

The preference centers in React, Next.js, TanStack Start, Vue, Nuxt and Svelte list each category's vendors with a switch per vendor. Switches edit the draft and record on Save, disable while the category is off, and clear on Accept all and Reject all. React adds `useVendorDraft`, `useVendorAllowed`, `useDeclaredVendors` and `useVendorChoice`; `useConsentDraft` gains `vendors` and `setVendor`; the Svelte manager state gains `selectedVendors` and `setSelectedVendor`.

Denials persist in a `<storageKey>-vendors` cookie and localStorage entry and reach the backend as `vendorChoice`. Migration `4-vendor-choice` adds the column, so run the migrator before deploying. A denial has no expiry and does not delete cookies the vendor already set.

Also fixed: the Vue preference center rendered its switches and category rows unstyled in Nuxt, and the Vue and Svelte category description colour differed from React's.

# @c15t/backend

## 3.0.0-alpha.1

### Patch Changes

- Updated dependencies [dd44a61]
  - @c15t/browser@3.0.0-alpha.1

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
  - @c15t/browser@3.0.0-alpha.0
  - @c15t/schema@3.0.0-alpha.0
  - @c15t/translations@3.0.0-alpha.0
