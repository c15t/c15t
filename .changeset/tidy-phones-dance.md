---
'@c15t/ui': patch
'@c15t/react': patch
'@c15t/nextjs': patch
'@c15t/cli': patch
---

Fix the RC theming regressions across the prebuilt UI and align the Tailwind setup contract with the shipped `@layer components` behavior.

- `@c15t/ui`: add a shared DOM style sanitizer for framework adapters, make switch track tokens apply from the rendered subtree, and add regression coverage for slot/style token behavior.
- `@c15t/react`: stop slot metadata like `noStyle` leaking to the DOM, wire the `consentWidgetAccordion` slot, and add real render-path regression tests for slot `style` and switch token overrides.
- `@c15t/nextjs`: keep the published stylesheet assets aligned with the package entrypoints used by the documented install path.
- `@c15t/cli`: update the Tailwind CSS template helper to standardize on `@layer base, components, utilities;` and add tests for the new setup contract.
