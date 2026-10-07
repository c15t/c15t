---
packages:
  '@c15t/tanstack-start': minor
  c15t: minor
---

### Share TanStack Start consent options with `ConsentManifestOptions`

Pass one options object to `createConsentStateHandler` and
`createConsentServerRoute`, so both use the same build-time snapshot:

```ts
export const consentOptions = {
	backendURL: 'https://your-project.inth.app',
	manifest: consentManifest,
} satisfies ConsentManifestOptions;
```
