---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### A smaller public interface for `@c15t/core`

`@c15t/core` (and `c15t`) stops exporting kernel verbs only its own modules
call, building blocks no adapter uses, and a second home for the manifest
cache.

**Kernel (`ConsentKernel`)**

| Removed | Use instead |
| --- | --- |
| `kernel.hydrate(records)` | Pass `initialRecords` to `createConsentKernel()`, or mount `createPersistence()` from `c15t/modules/persistence`. |
| `kernel.markLive()`, `kernel.holdSaves()`, `kernel.events.emit()` | Nothing; the runtime and persistence call them. |
| `kernel.set.vendorDraft(values)` | `kernel.commands.save(input, { vendors })`, or a preference draft's `setVendor()`. |

`kernel.getRecordsGeneration()` stays and is now documented.

**Runtime**

| Removed or renamed | Use instead |
| --- | --- |
| `runtime.onIABChange(listener)` | `runtime.subscribe(listener)`, and read `runtime.iab` inside the listener. |
| `createRuntimeKernel`, `hasResolvedPrefetch`, `normalizeKernelUser`, `resolveRuntimeTranslations`, `stringifyRuntimeError`, `ALL_CONSENTS_GRANTED` from `c15t/runtime` | Nothing; `createConsentRuntime` and `createConsentProviderRuntime` cover them. |
| `createPersistence(options, loader)`, `preloadPersistenceWriter()` | `createPersistence(options)`. |

`runtime.setOverrides()` merges into the current overrides, as it always
did; the docs used to say it replaces them.

**Server**

The manifest cache (`fetchCachedManifest`, `createManifestCache`,
`clearManifestCache`, `ManifestUnavailableError` and the manifest header
helpers) is exported from `@c15t/core/server` (`c15t/server`) only.
`@c15t/core/transports/manifest-cache` keeps `resolveManifestInit`,
`getResolverInputsFromHeaders`, `withResolutionBudget` and
`DEFAULT_RESOLVE_TIMEOUT_MS`.

These are no longer exported from `c15t/server`: the consent-proxy helpers
(`forwardConsentRequest`, `buildConsentProxyRequestHeaders`,
`buildConsentProxyResponseHeaders`, `filterCookieHeader`,
`rewriteProxySetCookie`, `stripIdentityForCleartext`, `isCleartextRemoteURL`,
`isConsentProxyPathAllowed`, `resolveConsentProxyOptions` and the
`CONSENT_PROXY_*` constants), the session-report helpers
(`reportConsentSession`, `buildConsentSessionReport`,
`forwardSessionReportHeaders`, `isSpeculativeRequest`,
`resolveSessionReportBackendURL`, `SESSION_REPORT_*`), `resolveConsentInit`,
`GVL_FETCH_TIMEOUT_MS` and `getManifestAge`. Use
`createConsentRouteHandler()`, which runs all of them.

**Root index**

No longer exported from `@c15t/core` / `c15t`: `setCookie`, `getCookie`,
`deleteCookie`, `deleteConsentFromStorage`, `CONTROL_ARM`,
`experimentArmRef`, `startExperiment`, `resolveExperimentPresentation`,
`disabledPolicyResolution`, `extractConsentNamesFromCondition`,
`hasRevokedPermission`, `initResponseToKernelConfig`,
`kernelConfigToInitResponse`, `mergeInitResponseIntoKernelConfig`,
`resolveVendors`, `vendorRenders`, `resolveWindowDebugMode`,
`createGvlReferenceURL`, `deferInitGvlToRoute`, `serveGvlReference`,
`validateExplicitChoice` and `validateNoticeDismissal`. Consent storage
belongs to the persistence module; `getRootDomain` stays for
`storageConfig`.

**Smaller pages**

The inline script that starts `/init` before the app loads (Nuxt `ssr: false`
pages, Next.js, TanStack Start, Astro) is 712 B gzip instead of 1,054 B.

**`@c15t/vue`**

**Breaking.** `@c15t/vue/runtime/utils/save-iab-choice` and
`c15t/vue/runtime/utils/save-iab-choice` are removed. Their
`saveIABChoice(kernel, save)` only called `saveIABConsentSurface(kernel, save)`
from `@c15t/core/surface-actions` (`c15t/surface-actions`); import that
instead.

**`@c15t/browser`**

`client.consentCategories` lists the policy's categories in the dialog's
fixed order: `necessary`, `functionality`, `measurement`, `experience`,
`marketing`. It used to put the configured `consentCategories` order first.
