---
packages:
  c15t: minor
---

### Warn that offline mode keeps no consent records

In a development build, offline mode now logs one `console.warn` per page in
the browser. The message says that consent stays in this browser, that c15t
keeps no server-side record of it, and that every visitor gets the same policy
because offline mode has no geolocation. It does not block the banner or change
consent, and production builds do not log it.

If you chose offline mode on purpose, for example for tests or a static demo,
set `acknowledgeNoRecords: true` next to `mode: 'offline'` to hide the message.
The option works in `configureConsentManager()`, `getOrCreateConsentRuntime()`,
and the `@c15t/react` and `@c15t/nextjs` provider options.
