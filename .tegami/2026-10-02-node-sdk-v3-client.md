---
packages:
  '@c15t/node-sdk': major
  '@c15t/schema': patch
---

### Replace the Node.js client with `createC15tClient`

`@c15t/node-sdk` has a new client. Create it with `createC15tClient({ baseUrl, apiKey })`. Every method resolves to `{ ok: true, data }` or `{ ok: false, error }` and never rejects, and `error.code` is typed per method. Input is checked before anything is sent, response dates are `Date` objects, and calls retry network errors, timeouts and 408, 429, 500, 502, 503 and 504, honouring `Retry-After`. A client created without `apiKey` has no `subjects.list`, `experiments.summary` or `legalDocuments.publish`. New methods: `manifest()` and `legalDocuments.publish()`. `@c15t/node-sdk/testing` exports `createMockC15tClient`, `ok` and `err`.

`patchSubjectOutputSchema` in `@c15t/schema` now matches what the backend sends: it drops `success` and adds `subject.identityProvider`.

#### Breaking changes

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
