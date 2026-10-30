---
packages:
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/dev-tools":
    replay:
      - exit-prerelease(npm:@c15t/dev-tools)
  "@c15t/iab":
    replay:
      - exit-prerelease(npm:@c15t/iab)
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
  "@c15t/schema":
    replay:
      - exit-prerelease(npm:@c15t/schema)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/translations":
    replay:
      - exit-prerelease(npm:@c15t/translations)
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
---

### Consent provider works again in browsers before Safari 15.4

Since 3.0, the consent provider has used `structuredClone`, `Object.hasOwn`,
`Array.prototype.at` and `Array.prototype.findLast`. Safari 15.4 was the first
Safari to ship them, and Chrome added them between 92 and 98. Without them, the
provider failed to mount or the banner did not render: Chrome and Android
WebView before 98, Firefox before 104, Safari and iOS Safari before 15.4, and
Samsung Internet before 18.

c15t no longer calls these built-ins in browser code. You can remove a polyfill
you added only for c15t.
