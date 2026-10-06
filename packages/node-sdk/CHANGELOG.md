## @c15t/node-sdk@3.0.0-alpha.5 (alpha)

### Remove the v2 `jurisdiction` label and `disableGeoLocation`

v3 decides consent from policy rules, so the regulation label v2 derived from a fixed country table (`GDPR`, `CCPA`, `NONE` and so on) is gone from the API.

- `/init` responses and session reports no longer carry `jurisdiction`, so `sessions.onReport` no longer receives it. Read the matched policy from `policyResolution`, or the report's `policy`, `country` and `region`.
- `@c15t/schema` removes `jurisdictionCodes`, `jurisdictionCodeSchema`, `JurisdictionCode` and `checkJurisdiction`. `@c15t/core` and `c15t` remove the unused `LocationInfo`, `ConsentBannerResponse` and `JurisdictionCode` types.
- The `disableGeoLocation` manifest option is removed. To show every visitor the same banner, configure one policy rule with `match: { isDefault: true }`; the browser resolves it without a location. To test a region's rule, set the country in the client's `overrides`, for example `overrides: { country: 'US' }`.
- The `/init` translations schema is now one shape with optional keys. `completeTranslationsSchema`, `partialTranslationsSchema` and the `partial*` section schemas are removed, along with the deprecated `frame` key, which the backend already folds into `consentGate`. `titleDescriptionSchema` now accepts a pair with `title` or `description` missing, so its inferred type has both fields optional.
- The backend still accepts `jurisdiction` in a save request from a 2.x client and ignores it. Policy snapshot tokens no longer carry the claim, and tokens that still do are accepted.
- Migration 7 makes `runtimePolicyDecision.jurisdiction` nullable; new decisions store `null` and 2.x rows keep their value. Apply it with `@c15t/cli self-host migrate --apply` before deploying this backend.

## @c15t/node-sdk@3.0.0-alpha.4 (alpha)

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

## @c15t/node-sdk@3.0.0-alpha.2 (alpha)

### Fix declaration imports for Node16 and NodeNext

Fix declaration imports for TypeScript consumers using Node16 or NodeNext resolution. Preserve explicit JavaScript filenames so exported APIs retain their types without requiring `skipLibCheck`.

# @c15t/node-sdk

## 3.0.0-alpha.1

### Patch Changes

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

## 2.2.0-canary-20260731105620

### Patch Changes

- Updated dependencies [08413ea]
  - @c15t/backend@2.2.0-canary-20260731105620

## 2.2.0-canary-20260728085441

### Patch Changes

- Updated dependencies [ee39d2c]
  - @c15t/backend@2.2.0-canary-20260728085441

## 2.2.0-canary-20260727202135

### Patch Changes

- 16a1f82: Dependency audit for the next release: remove unused `@orpc/*` dependencies from `@c15t/backend` and `@c15t/node-sdk`, update runtime dependencies (hono 4.12.27, valibot 1.4.2, defu 6.1.7, jose 6.2.3, zod 4.4.3, zustand 5.0.14, xstate 5.32.4, and more), and force security floors for kysely (SQL injection fixes) and protobufjs via workspace overrides. Builds now use TypeScript 7 (native compiler) with rslib 0.23 for type checking and declaration emit; emitted types are semantically unchanged.
- c7e53ff: Forward `x-c15t-version` on backend-bound requests from browser, SSR, prefetch, and Node SDK clients, and allow the header through backend CORS preflight handling.
- Updated dependencies [8c004cf]
- Updated dependencies [16a1f82]
- Updated dependencies [c7e53ff]
- Updated dependencies [e011d19]
- Updated dependencies [5406a8d]
- Updated dependencies [ca7784f]
- Updated dependencies [dfec101]
- Updated dependencies [30cb116]
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

## 2.0.4

### Patch Changes

- Updated dependencies [748536a]
  - @c15t/backend@2.0.4

## 2.0.2

### Patch Changes

- Updated dependencies [85b9106]
  - @c15t/backend@2.0.2

## 2.0.0

### Major Changes

- 32617c9: Changelog available at https://c15t.com/changelog/2.0.0

### Patch Changes

- Updated dependencies [32617c9]
  - @c15t/backend@2.0.0

## 2.0.0-rc.10

### Patch Changes

- Updated dependencies [9579b62]
  - @c15t/backend@2.0.0-rc.10

## 2.0.0-rc.8

### Patch Changes

- 918a70e: Fix published TypeScript declaration packaging so consumers stay compatible across both TypeScript 5 and TypeScript 6.

  - `@c15t/react`: correct the `./primitives` type export entries so they point at the published `dist-types` files instead of missing declaration paths.
  - `@c15t/backend`, `@c15t/cli`, `@c15t/dev-tools`, `@c15t/logger`, `@c15t/node-sdk`, and `@c15t/scripts`: normalize emitted `dist-types` imports during builds so published declarations no longer reference sibling `.d.ts` files directly, which could break consumers on newer TypeScript versions.
  - Tooling: make declaration normalization discover package targets dynamically so the compatibility fix applies consistently across published packages instead of only a hardcoded subset.

- Updated dependencies [3d5b0fd]
- Updated dependencies [918a70e]
- Updated dependencies [ad019de]
  - @c15t/backend@2.0.0-rc.8

## 2.0.0-rc.6

### Patch Changes

- Updated dependencies [bb3ab0f]
- Updated dependencies [1a724fc]
  - @c15t/backend@2.0.0-rc.6

## 2.0.0-rc.5

### Patch Changes

- e79f840: Separate published declaration files from runtime bundles to improve Vite compatibility

  - Move generated `.d.ts` files out of `dist/` into `dist-types/` across published packages
  - Stop emitting declaration maps in shared TypeScript config so `.d.ts.map` files are no longer published
  - Emit declarations only once per package to avoid unstable output when both `esm` and `cjs` builds write types
  - Update package `types` metadata, publish file lists, Turbo outputs, and publish artifact checks for the new layout
  - Verify the package layout works in Vite 7 without `optimizeDeps.exclude` workarounds for `c15t` and `@c15t/react`

- Updated dependencies [021ac99]
- Updated dependencies [cfe1b2e]
- Updated dependencies [e79f840]
- Updated dependencies [372cf92]
  - @c15t/backend@2.0.0-rc.5

## 1.8.5

### Patch Changes

- be4e218: Republish patch release to fix workspace dependency protocol resolution during publish.

  Published package manifests now resolve `workspace:*` references to concrete semver ranges before release.

- Updated dependencies [be4e218]
  - @c15t/backend@1.8.5

## 1.8.4

### Patch Changes

- 8defcd9: Update direct and transitive dependencies to address known vulnerabilities and keep runtime/tooling packages current.
- Updated dependencies [8defcd9]
  - @c15t/backend@1.8.4

## 1.8.0

### Patch Changes

- Updated dependencies [68a7324]
  - @c15t/backend@1.8.0

## 1.8.0-canary-20251112105612

### Patch Changes

- 6e3034c: refactor: update rslib to latest version
- Updated dependencies [7043a2e]
- Updated dependencies [6e3034c]
- Updated dependencies [bee7789]
- Updated dependencies [69d6680]
  - @c15t/backend@1.8.0-canary-20251112105612

## 1.8.0-canary-20251028143243

### Patch Changes

- 8f3f146: chore: update various dependancies
- Updated dependencies [8f3f146]
  - @c15t/backend@1.8.0-canary-20251028143243

## 1.7.0

### Patch Changes

- Updated dependencies [aa16d03]
  - @c15t/backend@1.7.0

## 1.7.0-canary-20251012181938

### Patch Changes

- Updated dependencies [c6518dd]
- Updated dependencies [a58909c]
- Updated dependencies [9f4ef95]
  - @c15t/backend@1.7.0-canary-20251012181938

## 1.6.0

### Patch Changes

- Updated dependencies [84ab0c7]
  - @c15t/backend@1.6.0
