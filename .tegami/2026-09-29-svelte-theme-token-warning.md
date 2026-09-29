---
packages:
  '@c15t/svelte': patch
---

### Warn in development when `theme` tokens have nowhere to apply

`ConsentManagerProvider` applies slots and `consentActions` from `theme`,
but it does not turn colors, radii, typography, spacing, shadows or motion
into CSS in the browser. Passing them without a stylesheet did nothing and
said nothing. In development the provider now logs a warning when `theme`
has tokens and the page has no `<style id="c15t-theme">`, pointing at
`generateThemeCSS` from `@c15t/ui/theme`. Production builds skip the check.
