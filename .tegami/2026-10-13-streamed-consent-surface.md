---
packages:
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Stream a headless banner with `StreamedConsentSurface`

`StreamedConsentSurface` lets a banner built with the headless hooks stream
like the stock `ConsentBanner`. With Next.js
`<ConsentRoot state={resolveConsent()}>` or a streamed TanStack Start loader,
it waits for the consent promise in its own `Suspense` boundary, so the
banner follows in a later chunk of the same response and shows before
hydration. Without a pending promise it renders its children as they are.
Call the hooks in a component inside it. Import it from
`c15t/react/headless`, `c15t/next/headless` or
`c15t/tanstack-start/headless`.
