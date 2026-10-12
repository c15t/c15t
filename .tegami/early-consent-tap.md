---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
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
`asChild`, `type="submit"` or `performDefaultAction={false}` keeps the old
behavior, so a handler that calls `preventDefault()`, a link or a form still
decides what its tap does. A held tap is recorded with the banner's
`uiSource`.

`kernel.commands.dismissNotice()` takes an optional `{ actionAt }`, the time
the visitor dismissed the notice. A future or invalid time falls back to now.
