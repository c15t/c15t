---
packages:
  '@c15t/svelte': patch
---

### Warn in development when `theme` tokens have nowhere to apply

`ConsentManagerProvider` applies slots and `consentActions` from `theme`,
but it does not turn colors, radii, typography, spacing, shadows or motion
into CSS in the browser. Passing them without a stylesheet did nothing and
said nothing. In development the provider now logs a warning when `theme`
has tokens and the page has no `<style id="c15t-theme">`. The warning
says to put the `--c15t-*` variables, or the CSS from `generateThemeCSS`,
in your stylesheet and drop the tokens from `theme`. An app that already
compiles its theme into a stylesheet silences it the same way. Production
builds skip the check.
