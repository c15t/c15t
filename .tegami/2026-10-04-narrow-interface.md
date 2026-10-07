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

`@c15t/core` and `c15t` stop exporting kernel verbs that only c15t calls,
building blocks no adapter uses, and duplicate manifest cache exports.

| Removed | Use instead |
| --- | --- |
| `kernel.hydrate(records)` | `initialRecords` on `createConsentKernel()`, or `createPersistence()` from `c15t/modules/persistence` |
| `kernel.set.vendorDraft(values)` | `kernel.commands.save(input, { vendors })` or a preference draft's `setVendor()` |
| `runtime.onIABChange(listener)` | `runtime.subscribe(listener)`, reading `runtime.iab` inside it |
| `createPersistence(options, loader)`, `preloadPersistenceWriter()` | `createPersistence(options)` |
| Consent-proxy and session-report helpers, `resolveConsentInit`, `GVL_FETCH_TIMEOUT_MS` and `getManifestAge` from `c15t/server` | `createConsentRouteHandler()` |
| `@c15t/vue/runtime/utils/save-iab-choice` and `c15t/vue/runtime/utils/save-iab-choice` | `saveIABConsentSurface(kernel, save)` from `c15t/surface-actions` |

Removed with no replacement are `kernel.markLive()`, `kernel.holdSaves()` and
`kernel.events.emit()`, and `createRuntimeKernel`, `hasResolvedPrefetch`,
`normalizeKernelUser`, `resolveRuntimeTranslations`, `stringifyRuntimeError` and
`ALL_CONSENTS_GRANTED` from `c15t/runtime`.

The consent-proxy helpers removed from `c15t/server` are
`forwardConsentRequest`, `buildConsentProxyRequestHeaders`,
`buildConsentProxyResponseHeaders`, `filterCookieHeader`,
`rewriteProxySetCookie`, `stripIdentityForCleartext`, `isCleartextRemoteURL`,
`isConsentProxyPathAllowed`, `resolveConsentProxyOptions` and `CONSENT_PROXY_*`.
The session-report helpers are `reportConsentSession`,
`buildConsentSessionReport`, `forwardSessionReportHeaders`,
`isSpeculativeRequest`, `resolveSessionReportBackendURL` and `SESSION_REPORT_*`.

The root index drops `setCookie`, `getCookie`, `deleteCookie`,
`deleteConsentFromStorage`, `CONTROL_ARM`, `experimentArmRef`,
`startExperiment`, `resolveExperimentPresentation`, `disabledPolicyResolution`,
`extractConsentNamesFromCondition`, `hasRevokedPermission`,
`initResponseToKernelConfig`, `kernelConfigToInitResponse`,
`mergeInitResponseIntoKernelConfig`, `resolveVendors`, `vendorRenders`,
`resolveWindowDebugMode`, `createGvlReferenceURL`, `deferInitGvlToRoute`,
`serveGvlReference`, `validateExplicitChoice` and `validateNoticeDismissal`.
`getRootDomain` stays.

The manifest cache (`fetchCachedManifest`, `createManifestCache`,
`clearManifestCache`, `ManifestUnavailableError` and the manifest header
helpers) is exported from `c15t/server` only.

In `@c15t/browser`, `client.consentCategories` lists categories in the dialog's
fixed order (`necessary`, `functionality`, `measurement`, `experience`,
`marketing`) instead of the configured order.
