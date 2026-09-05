---
'@c15t/react': patch
---

Emit the default theme tokens when no `theme` option is set. The prebuilt components read `--c15t-*` custom properties, and the provider only generated them for a user-supplied theme, leaving banners and dialogs without colours by default. The UI package's `defaultTheme` now fills in; a stylesheet can still override any token.
