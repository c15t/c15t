---
'@c15t/ui': patch
'@c15t/react': patch
'@c15t/nextjs': patch
'@c15t/cli': patch
---

Fix the RC theming regressions across the prebuilt UI, align the Tailwind setup contract with the shipped `@layer components` behavior, and tighten the customization guidance around when to use tokens, slots, compound components, `noStyle`, or headless mode.

- `@c15t/ui`: add a shared DOM style sanitizer for framework adapters, make switch track tokens apply from the rendered subtree, and add regression coverage for slot/style token behavior.
- `@c15t/react`: stop slot metadata like `noStyle` leaking to the DOM, wire the `consentWidgetAccordion` slot, add real render-path regression tests for slot `style` and switch token overrides, and refresh the compound-component examples to point users toward provider options, theme tokens, and slots before advanced composition.
- `@c15t/nextjs`: keep the published stylesheet assets aligned with the package entrypoints used by the documented install path.
- `@c15t/cli`: update the Tailwind CSS template helper to standardize on `@layer base, components, utilities;` and add tests for the new setup contract.
- Documentation: clarify the customization ladder across the AI agent guidance plus the React and Next.js component/styling docs so headless guidance is treated as the last step, not the default escape hatch.
