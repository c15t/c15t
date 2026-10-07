---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
---

### Load the Vue dialog's stylesheet with the dialog

Every page with the stock banner loaded the dialog's CSS up front, and in Nuxt
it was part of the render-blocking entry stylesheet (2.3 KB gzip). The dialog's
rules load with the dialog's own chunk. `ConsentDescription` keeps its props and
output.
