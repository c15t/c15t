---
packages:
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
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
