---
packages:
  c15t: minor
  '@c15t/react': minor
---

### Warn that offline mode keeps no consent records

Offline mode keeps consent only in the visitor's browser, so c15t has no
server-side record of it, and it has no geolocation, so every visitor gets the
same policy. In development builds, c15t now logs a `console.warn` once per
page when it creates an offline client in the browser. Production builds never
log it, and it never blocks consent.

Set `acknowledgeNoRecords: true` in the offline options to hide the message,
for example in tests:

```ts
configureConsentManager({ mode: 'offline', acknowledgeNoRecords: true });
```

`ConsentManagerProvider` in `@c15t/react` and `@c15t/nextjs` passes the option
through.
