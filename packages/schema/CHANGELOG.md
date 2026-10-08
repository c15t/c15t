## @c15t/schema@3.0.0-alpha.7 (alpha)

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

## @c15t/schema@3.0.0-alpha.6 (alpha)

### Show the consent banner at once, and fade it in only when it arrives late

The banner and the IAB banner no longer slide or scale in on a spring curve.
A banner that shows with the page is part of the first paint, where the
overshoot read as layout shift, so it now appears on its first frame. The
backdrop of a blocking banner appears with it.

A banner that arrives more than 100ms after the page first painted, such as
after a slow script or a client-side init, fades in instead of popping into a
page someone is already reading. It fades over `--c15t-duration-normal` on
`--c15t-easing-out` and never moves. Its root and backdrop carry
`data-entry="late"`, and `--consent-banner-entry-duration` and
`--consent-banner-entry-timing` (`--iab-consent-banner-entry-*` for the IAB
banner) set the fade. A banner rendered on the server always shows at once.
`@c15t/ui/utils/late-entry` exports the check as `isLateEntry`.

Hiding still fades the banner out where it did before, now without the slide
or scale, and on an ease-in curve so it speeds up as it leaves.
`disableAnimation` turns both fades off.

Add the `--c15t-easing-in` theme token, set with `motion.easingIn`. It defaults
to `cubic-bezier(0.55, 0.055, 0.675, 0.19)` and sets the banner's exit curve.

### Verified identity links

`GET /subjects?externalId=` and `GET /consents/check` now count only verified links between a subject and your user ID. A link is verified by an API key, or by an `identityToken` from `createIdentityToken` in `@c15t/node-sdk`, passed to `identify({ externalId, identityToken })` and checked against the new `identityToken.signingKey` option.

- `GET /consents/check` requires an API key, so `consents.check` moves to the node-sdk client created with `apiKey`.
- Existing links, including those made by v2, stay unverified until relinked.
- Migration 8 adds `subject.verifiedExternalId`.

## @c15t/schema@3.0.0-alpha.5 (alpha)

### Report who runs the backend as `window.c15t.hosting`

`c15tInstance()` takes a `hosting` option, `'self-hosted'` by default or `'inth'` on Inth's platform. `/init` and `/manifest` report it, and the browser exposes it as `window.c15t.hosting` and the snapshot's `hosting`. It is not signed, so treat it as a debugging signal.

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

## @c15t/schema@3.0.0-alpha.4 (alpha)

### Send the consent model as `model` on save

The `/subjects` save body names the consent model `model`, the same name the rest of the v3 API uses. It was `jurisdictionModel`, the last v2 jurisdiction name on the v3 wire.

- `@c15t/core` and the native iOS and Android cores send `model`.
- The backend reads `model` and still accepts `jurisdictionModel` from 2.x clients. When a save carries both, `model` wins.
- `postSubjectInputSchema` adds `model` and marks `jurisdictionModel` deprecated.

The backend only reads this field when a save has no policy decision. Deploy this backend with these clients: an older v3 alpha backend ignores `model`, so its consent records for such saves have no model.

### Remove the v2 `jurisdiction` label and `disableGeoLocation`

v3 decides consent from policy rules, so the regulation label v2 derived from a fixed country table (`GDPR`, `CCPA`, `NONE` and so on) is gone from the API.

- `/init` responses and session reports no longer carry `jurisdiction`, so `sessions.onReport` no longer receives it. Read the matched policy from `policyResolution`, or the report's `policy`, `country` and `region`.
- `@c15t/schema` removes `jurisdictionCodes`, `jurisdictionCodeSchema`, `JurisdictionCode` and `checkJurisdiction`. `@c15t/core` and `c15t` remove the unused `LocationInfo`, `ConsentBannerResponse` and `JurisdictionCode` types.
- The `disableGeoLocation` manifest option is removed. To show every visitor the same banner, configure one policy rule with `match: { isDefault: true }`; the browser resolves it without a location. To test a region's rule, set the country in the client's `overrides`, for example `overrides: { country: 'US' }`.
- The `/init` translations schema is now one shape with optional keys. `completeTranslationsSchema`, `partialTranslationsSchema` and the `partial*` section schemas are removed, along with the deprecated `frame` key, which the backend already folds into `consentGate`. `titleDescriptionSchema` now accepts a pair with `title` or `description` missing, so its inferred type has both fields optional.
- The backend still accepts `jurisdiction` in a save request from a 2.x client and ignores it. Policy snapshot tokens no longer carry the claim, and tokens that still do are accepted.
- Migration 7 makes `runtimePolicyDecision.jurisdiction` nullable; new decisions store `null` and 2.x rows keep their value. Apply it with `@c15t/cli self-host migrate --apply` before deploying this backend.

## @c15t/schema@3.0.0-alpha.3 (alpha)

### Resolve a relative backendURL against the request, not forwarding headers

A relative `backendURL` or `manifestURL` no longer resolves against client-controlled forwarding headers. The server helpers previously built the backend origin from `x-forwarded-host`, `x-forwarded-proto` or `referer` when present, so a request that set them could make the server send its `/init` or manifest request, with the request's cookies and forwarded headers, to another host.

A relative URL now resolves against the URL the framework resolved the request under (`event.url` in SvelteKit, `request.url` in Next.js route handlers, TanStack Start and Astro), or against the `host` header where no request URL exists (Next.js `resolveConsent`, `fetchSSRData`). A bare `host` resolves over `https` for a domain name and over `http` for `localhost`, an IP address, or a single-label host such as `app:3000`. The `referer` header is no longer used.

Apps behind a proxy that sets forwarding headers and drops incoming ones can opt back in with `trustForwardedHeaders: true` on SvelteKit `loadConsent` and `resolveConsent`, Next.js `resolveConsent`, `createNextConsentRouteHandlers` and `createPagesApiHandlers`, and `@c15t/react/server` `fetchSSRData` and `normalizeBackendURL`, matching the existing TanStack Start option. The rule lives in `resolveRequestBackendURL` and `resolveRequestOrigin`, new exports of `@c15t/core/server`, which every server adapter now shares. With the option set, the forwarded host and the forwarded scheme apply independently, so a proxy that keeps `host` and only sets `x-forwarded-proto` or `x-forwarded-ssl` still decides the scheme.

The SvelteKit and `@c15t/react/server` helpers also stop passing the client's `forwarded`, `x-forwarded-host` and `x-forwarded-proto` headers to the backend, including when `forwardHeaders` names them in SvelteKit. `extractRelevantHeaders` in both packages leaves them out unless called with `{ trustForwardedHeaders: true }`. `fetchSSRData` still makes its `/init` request when those headers are the only ones besides `host`; it just does not forward them.

`resolveBackendURL` from `@c15t/schema/types` is deprecated in favor of `resolveRequestBackendURL`. It now follows the same rule by default: it reads only the `host` header, and ignores `x-forwarded-*` and `referer` unless its new third argument is `{ trustForwardedHeaders: true }`, which restores the previous resolution order. The forwarded values are now validated like `host`: the first entry of a comma-separated list is used, a scheme other than `http` or `https` is ignored, and a host that is not a bare authority resolves to `null`.

### Update documentation links

Point documentation links in CLI prompts and errors, runtime warnings, TSDoc, package READMEs and package homepages at the current c15t.com docs pages. The old addresses led to pages that were moved or removed.

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

### Replace the Node.js client with `createC15tClient`

`@c15t/node-sdk` has a new client. Create it with `createC15tClient({ baseUrl, apiKey })`. Every method resolves to `{ ok: true, data }` or `{ ok: false, error }` and never rejects, and `error.code` is typed per method. Input is checked before anything is sent, response dates are `Date` objects, and calls retry network errors, timeouts and 408, 429, 500, 502, 503 and 504, honouring `Retry-After`. A client created without `apiKey` has no `subjects.list`, `experiments.summary` or `legalDocuments.publish`. New methods: `manifest()` and `legalDocuments.publish()`. `@c15t/node-sdk/testing` exports `createMockC15tClient`, `ok` and `err`.

`patchSubjectOutputSchema` in `@c15t/schema` now matches what the backend sends: it drops `success` and adds `subject.identityProvider`.

### Breaking changes

- `c15tClient()` and the `C15TClient` class are removed. Use `createC15tClient()`.
- The client no longer reads `C15T_API_URL`, `C15T_API_TOKEN` or `C15T_DEBUG`. Pass `baseUrl` and `apiKey`.
- `token` is now `apiKey`, `timeout` is `timeoutMs`, and `retryConfig` is `retry`. `prefix` and `debug` are removed; put the path in `baseUrl` and use `onEvent` for logging.
- The flat methods (`getSubject`, `checkConsent`, `patchSubject` and the rest) and `client.meta` are removed. Use the namespaced methods and `status()` and `init()`.
- `subjects.patch` is now `subjects.identify`, and returns `{ subject }` without `success`.
- `consent.check({ externalId, type: 'a,b' })` is now `consents.check({ externalId, types: ['a', 'b'] })`. `subjects.get` takes `{ types }` the same way.
- `ResponseContext` and its `unwrap`, `unwrapOr`, `expect` and `map` are replaced by result objects and the `unwrap(result)` helper. The `throw`, `onSuccess` and `onError` call options are removed.
- `C15TError` and `isC15TError` are now `C15tError` and `isC15tError`.
- `$fetch`, `fetcher`, `resolveUrl` and `createResponseContext` are no longer exported. Pass `fetch` to the client instead.
- `createMockClient`, `createMockResponse` and `createMockErrorResponse` are replaced by `createMockC15tClient`, `ok` and `err`.

See [Migrate to v3](https://c15t.com/docs/upgrade-v3#update-the-nodejs-sdk) for the full mapping.

Consent checks reject malformed results or missing requested policy types as `UNEXPECTED_RESPONSE`. Non-serializable request bodies and invalid per-call timers return `INVALID_INPUT`. Timeouts accept integers from 1 to 2147483647 milliseconds; retry delays accept integers from 0 to 2147483647. Invalid client settings throw `C15tConfigurationError`. Unknown stale-policy reasons are exposed as `undefined`.

Reject impossible calendar dates before publishing legal documents or querying experiment summaries. Manifest responses require schema version 2, a string revision and a supported branding value; invalid responses return `UNEXPECTED_RESPONSE`.

### Support IAB TCF 2.4

c15t now follows TCF 2.4 and TCF Policies v5.0.b. Existing TC strings stay valid.

- The IAB preference centre shows Features in their own section with the IAB standard text and no controls. Special Purposes stay locked.
- `__tcfapi` TC data includes `vendor.disclosedVendors`.
- `isServiceSpecific` is deprecated. TC strings always set IsServiceSpecific=1.
- Vendors that declare only Special Purposes no longer get a legitimate interest bit.
- GVL schemas keep unknown fields, so `standardTexts` survives the backend cache.

### Migration

Headless IAB UIs: `resolveIABDialogDisplayModel` now returns Features in `featureRows` instead of `essentialRows`. Render them without a control, under `featuresStandardText` or your `features.description` translation when it is `null`.

## @c15t/schema@3.0.0-alpha.2 (alpha)

### Record consent saves replayed after the policy token expired

A save that fails in the browser is queued and replayed on the next page load or when the browser comes back online, for up to 7 days, with the original click time and policy snapshot token. The self-hosted backend's tokens expire after 30 minutes, so a replay after that was refused with `409 POLICY_SNAPSHOT_INVALID` and the choice stayed in the browser only. The queue then retried it until its 10 attempts ran out.

The backend now records a late save when the token was valid at the save's `givenAt`: the signature, issuer and tenant audience verify, `givenAt` is within the token's lifetime (with 10 minutes of slack for the visitor's clock), the request arrives within `policySnapshot.replayWindowSeconds` of expiry (default 7 days; `0` turns it off), and the manifest still has the policy the token names under the same fingerprint. The record keeps `givenAt` as sent and gets `runtimePolicySource: 'snapshot_token_replayed'`. Saves that arrive while their token is valid are unchanged.

Refusals are now specific. A choice made after the token expired, or a replay after the window, is `409 POLICY_SNAPSHOT_EXPIRED`. A token naming a policy that has since changed is `422 STALE_POLICY` with reason `policy-changed`, live or late, so a choice is never recorded against a policy the visitor didn't see. A token that doesn't verify is still `409 POLICY_SNAPSHOT_INVALID`.

`@c15t/core`'s hosted and manifest transports throw a `ConsentSaveRejectedError` for these refusals, and the kernel drops the save instead of queueing or retrying it. The choice stays recorded in the browser. Queued older saves for the same categories are dropped too, so a grant queued while offline can't replay after the visitor's newer choice was refused. `save:replayed` events carry the backend's code in `rejected`. A custom transport can throw `ConsentSaveRejectedError` to get the same behaviour; `isConsentSaveRejection()` checks for one. Both are exported from `@c15t/core` and `@c15t/core/transports`.

### Migration

- Code that reads consent records and switches on `runtimePolicySource` should handle `snapshot_token_replayed`.
- Code that matched `409 POLICY_SNAPSHOT_INVALID` from `POST /subjects` should also expect `409 POLICY_SNAPSHOT_EXPIRED` and `422 STALE_POLICY` with reason `policy-changed`.
- To keep refusing every save that arrives after its token expired, set `policySnapshot.replayWindowSeconds: 0`.

### Keep policy pack resolution out of client bundles

The React provider and the core runtime resolved their disabled-mode policy with `resolvePolicyRules` when they loaded, so every page validated a rule and computed three SHA-256 fingerprints on startup, and every client bundle carried the policy validator and the hashing code. The kernel's policy wire reader also shared a module with `resolvePolicyRules`, which pulled in the same code. The disabled resolution is now a constant, pinned by a test to what the resolver returns, and `@c15t/schema/types` exports the wire reader and resolved-rule checks from their own modules. In a Next.js 16 production build of the App Router setup, first-load JavaScript drops by 17,665 bytes (5,313 bytes gzip). Every public export keeps its name and behavior.

## @c15t/schema@3.0.0-alpha.1 (alpha)

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

# @c15t/schema

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
  - @c15t/translations@3.0.0-alpha.0

## 2.1.1-canary-20260727202135

### Patch Changes

- 1d24803: Add Gujarati (`gu`) translations for cookie banner, consent dialog, and IAB TCF consent UI copy.
- 05b0abb: Add Hindi (`hi`) translations for cookie banner, consent dialog, and IAB TCF consent UI copy.
- 8c004cf: Improve generated OpenAPI request schemas for consent, subject, and legal-document endpoints.
- 16a1f82: Dependency audit for the next release: remove unused `@orpc/*` dependencies from `@c15t/backend` and `@c15t/node-sdk`, update runtime dependencies (hono 4.12.27, valibot 1.4.2, defu 6.1.7, jose 6.2.3, zod 4.4.3, zustand 5.0.14, xstate 5.32.4, and more), and force security floors for kysely (SQL injection fixes) and protobufjs via workspace overrides. Builds now use TypeScript 7 (native compiler) with rslib 0.23 for type checking and declaration emit; emitted types are semantically unchanged.
- 5406a8d: Match legal-document policy types (`privacy_policy`, `dpa`, `terms_and_conditions`) by prefix so suffixed variants like `terms_and_conditions_b2b` are accepted, letting multiple policies of one family be active at once. Unknown types are still rejected.
- ca7784f: Prevent duplicate consent records from concurrent identical submissions. Concurrent in-flight client saves with the same intent are coalesced, and backend submissions derive the consent primary key from tenant, subject, domain, policy, and `givenAt`, so identical requests collide on the key every deployed database already enforces. Scope legacy duplicate lookups to the current tenant, and reject timestamps outside JavaScript's representable `Date` range before deriving the ID.

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

## 2.0.1

### Patch Changes

- 748536a: Refine policy category scope handling.

## 2.0.0

### Major Changes

- 32617c9: Changelog available at https://c15t.com/changelog/2.0.0

## 2.0.0-rc.6

### Patch Changes

- 9579b62: Add token-first legal-document consent groundwork for `2.0`.

  - `c15t`: expand the unstable policy-consent input types so legal-document writes can prefer `documentSnapshotToken`, fall back to `policyHash`, and keep `policyId` only as a compatibility path.
  - `@c15t/backend`: update legal-document consent writes to resolve append-only consent against a verified document snapshot token when configured, or against a provided document hash when only lighter-weight release proof is available.
  - `@c15t/schema`: extend the subject consent schema and error shapes for legal-document snapshot tokens and hash-based legal-document resolution.

## 2.0.0-rc.5

### Patch Changes

- 3d5b0fd: Add legal-document snapshot support, persist document hashes on consent policies, and expose subject consent policy version/hash/effective-date metadata.

## 2.0.0-rc.4

### Patch Changes

- 1a724fc: fix(policy-packs): support multiple primary actions while keeping customize as the default primary action

  Expose `primaryActions` consistently across schema, backend, core, React, and dev-tools. Built-in preset and offline default policies keep `customize` as the default primary action, while custom policies can now mark multiple actions as primary.

## 2.0.0-rc.3

### Minor Changes

- 372cf92: feat(policy): add policy packs for declarative regional consent resolution

  Policy packs let you define regional consent rules once — c15t resolves the right policy automatically based on visitor location. Resolution follows fixed priority: region → country → fallback → default.

  - Built-in presets: `europeOptIn()`, `europeIab()`, `californiaOptOut()`, `californiaOptIn()`, `quebecOptIn()`, `worldNoBanner()`
  - Per-policy GPC support via `consent.gpc` field
  - Fallback policies (`match.fallback`) as a safety net when geo-location headers are missing
  - Material policy fingerprints for automatic re-prompting when consent semantics change
  - Policy validation with `inspectPolicies()` for catching misconfigurations before deployment
  - Snapshot tokens (signed JWT) for write-time consistency between `/init` and consent writes
  - Dev-tools match trace panel showing full resolution path

### Patch Changes

- cfe1b2e: feat: Add edge-compatible `/init` handler for running consent policy resolution at the edge

  - `c15tEdgeInit()` — drop-in `/init` replacement for Vercel Middleware, Cloudflare Workers, and Deno Deploy
  - `resolveConsent()` — lightweight synchronous resolver for custom consent cookie flows
  - `resolvePolicySync()` — synchronous policy matching without fingerprint computation
  - Refactored `/init` route to use shared `resolveInitPayload` (no behavior change)

- e79f840: Separate published declaration files from runtime bundles to improve Vite compatibility

  - Move generated `.d.ts` files out of `dist/` into `dist-types/` across published packages
  - Stop emitting declaration maps in shared TypeScript config so `.d.ts.map` files are no longer published
  - Emit declarations only once per package to avoid unstable output when both `esm` and `cjs` builds write types
  - Update package `types` metadata, publish file lists, Turbo outputs, and publish artifact checks for the new layout
  - Verify the package layout works in Vite 7 without `optimizeDeps.exclude` workarounds for `c15t` and `@c15t/react`

## 2.0.0-rc.2

### Patch Changes

- 408df0e: feat: CMP ID now comes from backend, either inth.com when hosted or BYO CMP ID
  feat: Center the IAB Banner for better policy compliance
  feat: Improve doc comments around IAB

## 2.0.0-rc.1

### Patch Changes

- 0bc4f86: fixed workspace resolving

## 2.0.0-rc.0

### Major Changes

- 126a78b: https://c15t.com/changelog/2.0.0-rc.0
