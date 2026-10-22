---
packages:
  '@c15t/core': patch
  '@c15t/integrations': minor
  '@c15t/scripts': patch
  '@c15t/cli': patch
---

### Add Gainsight PX consent integration

`gainsightPx()` loads Gainsight PX only after `measurement` consent. Includes configuration and revocation guidance, loader contract tests, and CLI setup support. Regrant and provider remounts reuse the executed SDK and restore enable and optional identify calls only after consent. Denied remounts forward disable and reset commands. Changing the product key after the SDK starts now throws an error and requires a page reload, preserving immediate consent revocation. The script loader supports retaining completed loads while removing pending loader elements on revocation.

Retries before SDK startup rebuild the pending queue from the current product, configuration and identity, including server-generated startup. Interrupted setups no longer supply stale identity or product data to the next loader.

Gainsight PX runtime detection survives object-spread customization made before startup, so retaining the same script copy across disposal and remount does not execute the SDK again. Core's `callbackOnly` also accepts a zero-argument boolean predicate, evaluated at mount time, for diagnostics and for server startup.

Fresh spread copies with equivalent options preserve pending Gainsight PX downloads across rerenders. DOM scripts with the same resource and disposal callback now retain their lifecycle until removal or loader disposal. Changing the resource or disposal callback still runs cleanup, and callback-only registrations retain their object-owned lifecycle.

Script diagnostics report completed callback-only registrations as loaded, including configurations with a fallback script URL.

Product-key or configuration changes after PX starts are rejected before registration or replacement, including scripts created before startup and later remounts. Reload the page to change startup settings. Equivalent configuration objects still match by value, and supported identity updates remain available. Validation preserves the original SDK configuration and consent handling.

Hydration rejects client options that differ from the server-started PX setup, including configuration, user and account identity, product key and loader URL. c15t preserves startup settings outside PX's function stub, so validation still runs after the SDK finishes loading and discards its queue. Matching options preserve the existing SDK and loader.

A failing callback-only predicate no longer aborts unrelated server starts. Scripts sharing its resource stay with the client loader so every owner's setup runs. Predicate results enable callback-only mode only when they are exactly `true`.
