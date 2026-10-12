---
packages:
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
---

### Warn in development when `theme` tokens have nowhere to apply

`ConsentManagerProvider` applies slots and `consentActions` from `theme`, but
does not turn tokens such as colors or spacing into CSS. In development it logs
a warning when `theme` has tokens and the page has no
`<style id="c15t-theme">`. Put the `--c15t-*` variables, or the output of
`generateThemeCSS`, in your stylesheet and drop the tokens from `theme`.
