---
packages:
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Share Next.js consent options with `ConsentManifestOptions`

Pass one options object to `resolveConsent` and the consent route handlers, so
both use the same build-time snapshot:

```ts
export const consentOptions = {
	config: consentConfig,
	manifest: consentManifest,
} satisfies ConsentManifestOptions;
```

`createNextConsentRouteHandlers` and `createPagesApiHandlers` now accept
`config`.
