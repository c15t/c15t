---
packages:
  '@c15t/core': patch
  '@c15t/browser': patch
  '@c15t/react': patch
---

### Send a bundled manifest's `/init` from the provider's first render

With `manifest()` from `@c15t/browser` as the `ConsentProvider` mode, a
visitor whose banner depends on a location the browser does not know waited
for the provider to mount before `/init` left. The request now leaves during
the provider's first client render, as it does with `hosted()`, and the mount
takes that response instead of asking again. Nothing is sent early when the
bundled manifest can answer on its own, when the visitor has a stored choice,
or with a `prefetch` or an `experiment`.
