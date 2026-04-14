---
'@c15t/ui': patch
'@c15t/react': patch
'@c15t/nextjs': patch
---

Fix the `PolicyActions` DX regressions and the published stylesheet packaging for the prebuilt consent UI.

- `@c15t/ui`: deduplicate policy-action helper ownership behind `c15t`, normalize widget footer subgroup naming, and add direct coverage for action-group flattening.
- `@c15t/react`: share the internal `PolicyActions` renderer across banner and widget, add `consentAction` to policy-action render props so stock overrides preserve built-in theming, restore the banner default footer layout when policy hints do not provide a layout, and extend regression coverage.
- `@c15t/nextjs`: keep the published stylesheet bridge files aligned with the package entrypoints and publish-artifact guard.
