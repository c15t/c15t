---
packages:
  '@c15t/core': patch
  '@c15t/react': patch
  '@c15t/vue': patch
  '@c15t/nextjs': patch
  '@c15t/tanstack-start': patch
  c15t: patch
---

### Keep banner taps made before the page hydrates

A banner rendered on the server shows before the page's JavaScript runs. On a
slow phone that gap lasts seconds: about 2 s on Next.js and 1.2 s on Nuxt in
our mobile benchmark. A tap on Accept all or Reject all in that gap did
nothing. The button had no handler yet, the banner stayed up and no choice
was saved.

The stock banner in React, Next.js, TanStack Start, Vue and Nuxt now renders
a small inline script in front of its buttons. It holds an Accept all, Reject
all, notice dismiss or Customize tap and hides the banner straight away for
the first three. Once the banner hydrates and the runtime has started, c15t
records the choice or the notice dismissal with the time of the tap, so
later init data can't overwrite it, then saves it and loads the scripts it allows. Customize opens
the dialog. A tap is dropped and the banner shows again when the browser
resolves a different consent model or prompt than the one the visitor saw.

Under a Content Security Policy the script takes the `nonce` you already pass
to c15t. The IAB banner and banners built from hooks are unchanged. In a
banner composed from `ConsentBanner.*` parts, a button with its own `onClick`,
on itself or on its `asChild` element, or `performDefaultAction={false}` keeps the old behavior, so a handler that
calls `preventDefault()` still decides what its tap does.

`kernel.commands.dismissNotice()` takes an optional `{ actionAt }`, the time
the visitor dismissed the notice. A future or invalid time falls back to now.
