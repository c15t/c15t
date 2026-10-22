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

Script diagnostics report completed callback-only registrations as loaded, including configurations with a fallback script URL.

A product-key replacement created before PX starts is rejected when registered after startup. Validation runs before replacing any loader registrations, preserving the original SDK configuration and consent handling.

A failing callback-only predicate no longer aborts unrelated server starts. Scripts sharing its resource stay with the client loader so every owner's setup runs. Predicate results enable callback-only mode only when they are exactly `true`.
