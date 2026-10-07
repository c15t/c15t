---
packages:
  "@c15t/node-sdk":
    replay:
      - exit-prerelease(npm:@c15t/node-sdk)
  "@c15t/schema":
    replay:
      - exit-prerelease(npm:@c15t/schema)
---

### Replace the Node.js client with `createC15tClient`

`@c15t/node-sdk` has a new client, `createC15tClient({ baseUrl, apiKey })`.
Every method resolves to `{ ok: true, data }` or `{ ok: false, error }` and
never rejects, and `error.code` is typed per method. Input is checked before
sending, response dates are `Date` objects, and calls retry network errors,
timeouts and 408, 429, 500, 502, 503 and 504, honoring `Retry-After`. A client
without `apiKey` has no `subjects.list`, `experiments.summary` or
`legalDocuments.publish`. New methods are `manifest()` and
`legalDocuments.publish()`. Invalid client settings throw
`C15tConfigurationError`.

`patchSubjectOutputSchema` in `@c15t/schema` drops `success` and adds
`subject.identityProvider`, matching what the backend sends.

#### Breaking changes

- `c15tClient()` and the `C15TClient` class are removed. Use
  `createC15tClient()`.
- The client no longer reads `C15T_API_URL`, `C15T_API_TOKEN` or `C15T_DEBUG`.
  Pass `baseUrl` and `apiKey`.
- `token` is now `apiKey`, `timeout` is `timeoutMs`, and `retryConfig` is
  `retry`. `prefix` and `debug` are removed. Put the path in `baseUrl` and use
  `onEvent` for logging.
- The flat methods (`getSubject`, `checkConsent`, `patchSubject` and the rest)
  and `client.meta` are removed. Use the namespaced methods, `status()` and
  `init()`.
- `subjects.patch` is now `subjects.identify` and returns `{ subject }` without
  `success`.
- `consent.check({ externalId, type: 'a,b' })` is now
  `consents.check({ externalId, types: ['a', 'b'] })`. `subjects.get` takes
  `{ types }` the same way.
- `ResponseContext` and its `unwrap`, `unwrapOr`, `expect` and `map` are
  replaced by result objects and the `unwrap(result)` helper. The `throw`,
  `onSuccess` and `onError` call options are removed.
- `C15TError` and `isC15TError` are now `C15tError` and `isC15tError`.
- `$fetch`, `fetcher`, `resolveUrl` and `createResponseContext` are no longer
  exported. Pass `fetch` to the client instead.
- `createMockClient`, `createMockResponse` and `createMockErrorResponse` are
  replaced by `createMockC15tClient`, `ok` and `err` from
  `@c15t/node-sdk/testing`.

See [Migrate to v3](https://c15t.com/docs/upgrade-v3#update-the-nodejs-sdk) for
the full mapping.
