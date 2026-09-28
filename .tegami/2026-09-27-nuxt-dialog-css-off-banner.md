---
packages:
  c15t: patch
  "@c15t/vue": patch
---

### Load the Vue dialog's stylesheet with the dialog

The stock banner's description imported the dialog's style map, and a style map brings its stylesheet with it. So every page with the banner loaded the dialog's rules up front; in Nuxt they were part of the render-blocking entry stylesheet (14.7 KB raw, 2.3 KB gzip). The banner now renders its description without the dialog's map, and the dialog's rules load with the dialog's own chunk. `ConsentDescription` keeps its props and output.
