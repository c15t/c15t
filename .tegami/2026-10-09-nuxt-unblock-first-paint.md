---
packages:
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Stop c15t stylesheets blocking the first paint in Nuxt

Nuxt inlined the banner's styles into the HTML and also linked the same CSS
as render-blocking stylesheets, together with the dialog trigger's CSS,
which no first paint uses. On a throttled phone, a page with a banner first
painted at about 1,070 ms instead of 450 ms.

`ConsentRoot` now loads the banner and the trigger as their own chunks.
Every page preloads the banner chunk, and the CSS Nuxt inlines is preloaded
instead of linked. The browser applies that CSS with the chunk, before it
shows a banner it renders itself. The trigger chunk loads after the page
mounts, and only with `showTrigger`. With `features.inlineStyles: false`,
Nuxt keeps linking the banner's CSS.

Pages outside client manifest mode also stop prefetching the client
manifest resolver and its translations (about 66 KB gzip), which they never
load at startup.

The plain Vue plugin's `ConsentRoot` loads the trigger as its own chunk
too.
