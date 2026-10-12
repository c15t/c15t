---
packages:
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

### Load new copy from `useSetLanguage()` and fix composed banner parts

`useSetLanguage()` runs init again after storing the language, so the banner and
dialog switch language without a separate `init()` call. The React `offline()`
mode, also exported by `@c15t/nextjs` and `@c15t/tanstack-start`, is now core's
`offline()`, so `useSetLanguage()` and `overrides.language` switch the copy when
translations exist for that language.

`ConsentProvider` with `runtime` no longer accepts `options.callbacks` in its
types and warns in development, because the provider dropped them without
notice. Pass callbacks to `createConsentRuntime({ callbacks })`.

Composed banner parts:

- `ConsentBanner.Card` keeps its focus trap when given a callback ref.
- `ConsentBanner.Title` and `ConsentDialog.HeaderTitle` with `asChild` render
  the child element in place of the `h2` instead of inside it.
  `ConsentBanner.Overlay` honors `asChild`.
- `ConsentBanner.Description` and `ConsentDialog.HeaderDescription` with
  `asChild` and no child element render their default markup instead of nothing.
- Hand-placed `ConsentBanner.AcceptButton`, `RejectButton` and `CustomizeButton`
  carry `data-action` and pick up `theme.consentActions`, as in the stock
  banner.
