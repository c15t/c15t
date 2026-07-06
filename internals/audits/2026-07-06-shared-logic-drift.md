# Shared-logic drift audit — v3 framework packages (2026-07-06)

**Why this exists:** two production bugs this week came from the same disease —
framework packages re-implementing a c15t domain rule locally instead of using
the shared implementation, then drifting: (1) the Next.js/Svelte server helpers
invented a `c15t-consent` JSON cookie that nothing ever wrote (the persistence
module writes `c15t` in the v2-compact format) → SSR repeat visitors were
re-prompted; (2) the v3 kernel replaced init translations wholesale where v2 and
the schema resolver deep-merge → partial payloads blanked copy (CLS + branding
loss). Both are fixed; this audit sweeps for the rest of the class.

**Rule going forward:** a c15t domain decision (header names/precedence, cookie
name/format, language negotiation, URL resolution, init folding, payload
shapes) lives in exactly one shared module (schema/core/translations), and
framework packages call it. Framework-native APIs are used only to *obtain*
raw inputs (headers, cookies), never to interpret them. Where practical, add a
conformance/enforcement test so drift fails CI — the slot-contract tests and
the cookie fix are the pattern.

**Status: ALL 8 FINDINGS RESOLVED (2026-07-06, same day).** #1-#3 landed in
`7a358a37` (canonical geo/language/GPC extractor in schema with x-c15t-first
precedence pinned by test; shared resolveBackendURL); #4-#8 in the following
commit (shared init fold, subject-body builder, React i18n deep-merge,
buildDefaultOptInPolicy, Vue policy-action delegation). Framework-native
acquisition retained throughout. The findings below are kept as the record of
what drift looked like.

---

**1. Critical: Geo/language/GPC Header Rules Are Duplicated And Diverged**
Canonical home: [packages/schema/src/shared/geo-headers.ts](packages/schema/src/shared/geo-headers.ts:1)

Canonical precedence:
- country: `x-c15t-country`, `cf-ipcountry`, `x-vercel-ip-country`, `x-amz-cf-ipcountry`, `x-country-code`
- region: `x-c15t-region`, `x-vercel-ip-country-region`, `x-region-code`

Drift:
- [nextjs/src/v3/headers.ts](packages/nextjs/src/v3/headers.ts:3): country puts `x-vercel-ip-country` before `cf-ipcountry`, adds `x-country`; region adds `cf-region-code`.
- [react/src/v3/server/headers.ts](packages/react/src/v3/server/headers.ts:1): omits `x-c15t-country`, `x-c15t-region`, `cf-region-code`; country starts with `cf-ipcountry`.
- [svelte/src/lib/server/headers.ts](packages/svelte/src/lib/server/headers.ts:1): same omissions as React, but smaller forwarded allowlist.
- [svelte/src/lib/server/index.ts](packages/svelte/src/lib/server/index.ts:41): second inline list uses `x-vercel-ip-country`, `cf-ipcountry`, `x-country`; region uses `x-vercel-ip-country-region`, `cf-region-code`.
- [vue/src/runtime/kernel.ts](packages/vue/src/runtime/kernel.ts:30): `INIT_HEADER_NAMES` omits `x-amz-cf-ipcountry`, `x-country-code`, `x-region-code`; `getManifestInputs` also omits those and uses only `x-c15t-country`, `cf-ipcountry`, `x-vercel-ip-country`.
- [core/src/v3/transports/hosted.ts](packages/core/src/v3/transports/hosted.ts:101): allowlist includes canonical plus `sec-gpc`, but not `cf-region-code`/`x-country`.

Impact: same request can resolve a different country/region per framework, changing jurisdiction, policy pack, banner model, and cache key. Normalized `x-c15t-*` overrides are especially fragile in React/Svelte extraction.

**2. High: Accept-Language Parsing Is Split**
Canonical behavior: [packages/translations/src/utils.ts](packages/translations/src/utils.ts:123) parses all entries, lowercases primary subtags, sorts by `q`, dedupes; `selectLanguage` uses that order at [utils.ts:196](packages/translations/src/utils.ts:196).

Drift:
- Next local parser returns only first raw tag, keeps region, ignores `q`, rejects length > 10: [nextjs/src/v3/headers.ts](packages/nextjs/src/v3/headers.ts:37)
- Svelte server parser is same: [svelte/src/lib/server/index.ts](packages/svelte/src/lib/server/index.ts:13)
- Backend legacy parser returns first primary tag and defaults `en`: [backend/src/handlers/init/index.ts](packages/backend/src/handlers/init/index.ts:61)
- Backend subject parser returns first primary tag or `undefined`: [backend/src/handlers/subject/post.handler.ts](packages/backend/src/handlers/subject/post.handler.ts:326)
- Vue manifest path passes raw `accept-language`: [vue/src/runtime/server/manifest-mode.ts](packages/vue/src/runtime/server/manifest-mode.ts:199)

Impact: `de;q=1,en;q=0.1` can resolve as `de` in schema but `en` or `en-US` in framework SSR overrides, causing wrong copy and avoidable cache fragmentation.

**3. High: Backend URL Normalization Differs**
No shared canonical home found.

Implementations:
- Next server helper: [nextjs/src/v3/server.ts](packages/nextjs/src/v3/server.ts:181) uses `x-forwarded-proto`, `x-forwarded-ssl`, `x-forwarded-host`, `host`, fallback `localhost`, no trim.
- React/Svelte server helpers: [react normalize](packages/react/src/v3/server/normalize-url.ts:88), [svelte normalize](packages/svelte/src/lib/server/normalize-url.ts:55) require absolute or `/`, default proto `https`, use `referer` fallback, trim trailing slash, return `null` on failure.
- Next route API: [nextjs/src/v3/api.ts](packages/nextjs/src/v3/api.ts:75) resolves from `request.url`, ignoring forwarded host/proto.

Impact: server prefetch can call different origins or schemes behind proxies, especially Vercel/Nginx/Cloudflare setups.

**4. High: InitOutput/InitResponse Folding Is Reimplemented**
Canonical-ish existing path: [core/src/v3/transports/init-output.ts](packages/core/src/v3/transports/init-output.ts:33) plus [core/src/v3/kernel/apply-init-response.ts](packages/core/src/v3/kernel/apply-init-response.ts:62).

Duplicates:
- Next manual merge: [nextjs/src/v3/server.ts](packages/nextjs/src/v3/server.ts:314)
- Svelte manual merge: [svelte/src/lib/server/index.ts](packages/svelte/src/lib/server/index.ts:108)
- Vue direct `InitOutput -> KernelConfig`: [vue/src/runtime/kernel.ts](packages/vue/src/runtime/kernel.ts:83)
- React SSR mapper: [react/src/v3/provider.tsx](packages/react/src/v3/provider.tsx:303)

Drift:
- Vue does not derive `initialOverrides` from `location`/`translations.language`.
- Next/Svelte manual `KernelConfig` merge handles `consents` but not `hasConsented`.
- React SSR/custom passes `branding` through as-is, while core maps `branding: "none"` to `undefined`; `KernelBranding` does not include `"none"`.

Impact: first paint state, branding visibility, IAB enablement, and stored-consent hydration can differ by framework.

**5. Medium: Save Payload Shape Is Rebuilt In Multiple Transports**
Canonical schema: [schema/src/api/subject/post.ts](packages/schema/src/api/subject/post.ts:24)

Builders:
- Core hosted: [core/src/v3/transports/hosted.ts](packages/core/src/v3/transports/hosted.ts:175)
- Core manifest: [core/src/v3/transports/manifest.ts](packages/core/src/v3/transports/manifest.ts:286)
- React custom transport: [react/src/v3/provider.tsx](packages/react/src/v3/provider.tsx:365)

Drift: React custom omits `metadata.userProperties`; manifest transport uniquely adds assertion fields (`policyId`, `fingerprint`, `country`, `region`, `language`, `gpc`) when no `policySnapshotToken`.

Impact: custom endpoint users can silently lose user metadata or policy replay guarantees.

**6. Medium: Provider I18n Fallback/Merge Differs**
Canonical merge helper: [translations/src/utils.ts](packages/translations/src/utils.ts:87)

Drift:
- React provider picks `i18n.messages[language] ?? i18n.messages.en ?? default en` without deep merge: [react/src/v3/provider.tsx](packages/react/src/v3/provider.tsx:196)
- Svelte provider deep-merges selected messages over default language base using `@c15t/ui/utils` merge: [svelte/src/lib/components/consent-manager-provider.svelte](packages/svelte/src/lib/components/consent-manager-provider.svelte:107)
- Core init application deep-merges same-language init translations: [core/src/v3/kernel/apply-init-response.ts](packages/core/src/v3/kernel/apply-init-response.ts:38)

Impact: partial translation overrides can blank nested copy in React but not Svelte/core.

**7. Medium: Offline/Inline Policy Fallbacks Differ**
Canonical no-policy helper exists: [schema/src/shared/consent-manifest.ts](packages/schema/src/shared/consent-manifest.ts:85)

Drift:
- React inline policy returns `undefined` when no categories: [react/src/v3/provider.tsx](packages/react/src/v3/provider.tsx:278)
- Svelte inline policy defaults to all five categories: [svelte/src/lib/components/consent-manager-provider.svelte](packages/svelte/src/lib/components/consent-manager-provider.svelte:151)
- Core offline falls back to `no_banner`: [core/src/v3/transports/offline.ts](packages/core/src/v3/transports/offline.ts:125)

Impact: offline/no-backend behavior can render a banner in Svelte, no banner in core, or provisional behavior in React.

**8. Low: Vue Reimplements Policy Action Resolution**
Canonical exported via `c15t`/`@c15t/ui`: [core/src/libs/policy-actions.ts](packages/core/src/libs/policy-actions.ts:27), re-exported at [ui/src/utils/policy-actions.ts](packages/ui/src/utils/policy-actions.ts:8).

Vue local copy: [vue/src/runtime/composables/use-consent-policy-actions.ts](packages/vue/src/runtime/composables/use-consent-policy-actions.ts:10)

Impact: currently mostly identical, but future policy UI semantics will drift unless Vue imports the shared resolver.

**Consent Cookie Writes**
No second v3 consent-cookie writer found in the audited framework surfaces. Canonical write path is [core/src/v3/modules/persistence/write.ts](packages/core/src/v3/modules/persistence/write.ts:33), using shared cookie operations at [core/src/v3/libs/cookie/operations.ts](packages/core/src/v3/libs/cookie/operations.ts:36). The Vue `useCookie` stub is generic and appears unused; Next middleware writes geo cookies only, not consent cookies.