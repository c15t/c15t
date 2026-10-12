---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Start loading the Astro preference dialog on hover and focus

Hovering or focusing a control that opens the preference dialog starts
downloading the dialog island, so the first Customize click usually finds it
ready. Visitors who only accept or reject still download nothing.
