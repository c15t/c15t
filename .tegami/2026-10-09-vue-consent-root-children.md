---
packages:
  '@c15t/vue': patch
  c15t: patch
---

### Render children passed to `ConsentRoot` in Vue and Nuxt

`ConsentRoot` had no default slot, so wrapping an app in it, the way a React
app sits inside a provider, dropped everything inside without a warning and
the page never rendered. The Vue and Nuxt `ConsentRoot` now render their
default slot after the banner, dialog and trigger, on the server and in the
browser.

Keep rendering `<ConsentRoot />` next to your page content, such as
`<NuxtPage />`. It is not a provider, so wrapping adds nothing; this change
only stops a wrapped app from disappearing.
