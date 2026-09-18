---
'c15t': minor
'@c15t/schema': minor
'@c15t/scripts': minor
'@c15t/dev-tools': minor
---

Add vendor-level consent outside IAB TCF. Declare vendors with the runtime's `vendors` option or the backend manifest's `vendors`, then name them through `vendor` on scripts and network rules and `data-vendor` on iframes. A target loads when its category passes and the visitor has not turned its vendor off; the slug is inert under an `iab` policy.

Vendor denials are stored in a new `<storageKey>-vendors` cookie and localStorage entry, hydrated on the server from the request cookie header, and sent to the backend as `vendorChoice` on save. `kernel.set.vendorDraft()`, `save(input, { vendors })`, the `vendors:set` and `vendors:recorded` events, and `ScriptCallbackInfo.vendor` are new. `@c15t/scripts` integrations set `vendor` to their manifest slug and send every Consent Mode or RudderStack category as denied while their vendor is off.

Accept all and reject all clear the denial list. New vendors default to on inside a granted category. Turning a vendor off does not delete cookies that vendor already set, and a denial has no expiry. Declaring backend vendors changes the manifest revision. The `Script.vendorId` docs now state it is IAB-only.
