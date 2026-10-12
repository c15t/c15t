---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
---

### `ConsentGate` mounts a granted embed after hydration

Breaking. With the App Router's awaited `resolveConsent` layout, a returning
visitor who had allowed the category downloaded a `ConsentGate` iframe twice.
`ConsentGate` no longer puts granted children in the server HTML. They mount
after hydration, so the iframe loads once. A denied category still gets the
placeholder in the server HTML, and client-side renders mount children at once.

#### Migration

- Tests or crawlers that read a granted embed from the server response need to
  wait for hydration.
- Size the wrapper with `className` or `style` so the page keeps the embed's
  space while it mounts.
