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

`useSetLanguage()` now runs init again after storing the language, so the banner and dialog switch to that language without a separate `init()` call. Setting the current language does nothing, and a disabled provider stores the language without running init. With a `runtime` passed to `ConsentProvider`, the runtime reinitializes itself.

The React `offline()` mode, also exported by `@c15t/nextjs` and `@c15t/tanstack-start`, is now core's `offline()`. A language from `useSetLanguage()` or `overrides.language` switches the copy when the bundled translations or `i18n.messages` have that language, and a language with no copy keeps the default copy. The language a server prefetch detected from `Accept-Language` still does not switch the copy, including when `prefetch` is a pending promise.

`ConsentProvider` logs a development warning when `options.callbacks` is passed together with `runtime`. The runtime runs the callbacks its owner passed to `createConsentRuntime({ callbacks })`, and the provider's own callbacks were dropped without notice. The options type for a borrowed runtime now rejects `callbacks`.

Composed banner parts:

- `ConsentBanner.Card` fills a callback ref and keeps its focus trap. Before, a callback ref replaced the ref the trap read, so a blocking card did not trap focus.
- `ConsentBanner.Title` and `ConsentDialog.HeaderTitle` with `asChild` render the child element, such as an `h1`, in place of the `h2`. Before, the child was nested inside the `h2`. `ConsentBanner.Overlay` now honors `asChild` too. `ConsentBanner.Description` and `ConsentDialog.HeaderDescription` with `asChild` and no child element render their default markup instead of nothing.
- `ConsentBanner.AcceptButton`, `RejectButton` and `CustomizeButton` placed by hand now carry `data-action="accept"`, `"reject"` and `"customize"`, as they do in the stock banner, and pick up `theme.consentActions.accept`, `.reject` and `.customize`. An explicit `data-action` or `consentAction` prop still wins.
