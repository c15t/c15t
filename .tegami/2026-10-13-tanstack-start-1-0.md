---
packages:
  '@c15t/tanstack-start': patch
---

### Support TanStack Start 1.0

`@c15t/tanstack-start` is now built and tested against TanStack Start 1.0
(`@tanstack/react-start` 1.169 and `@tanstack/react-router` 1.170.44).
`@tanstack/react-start` 1.168.60 and later 1.168 releases still work, and the
peer ranges are unchanged: `@tanstack/react-start` `^1.168.60` and
`@tanstack/react-router` `^1.170.41`.

TanStack Start 1.0 needs Vite 8 or later, up from Vite 7, so upgrade Vite before
you upgrade TanStack Start. Upgrade `@tanstack/react-router` with it: each
`@tanstack/react-start` release depends on one exact router version, 1.170.43
or later for 1.0, and an older router in your app installs a second copy.

TanStack Start 1.0 also removes `.inputValidator()` from `createServerFn()` and
`createMiddleware()`. If your app calls it, rename it to `.validator()` when you
upgrade. The c15t integration and the code it generates don't call it.
