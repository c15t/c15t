---
packages:
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
---

### Load each component stylesheet rule once

Apps that import `styles.css` no longer download component rules twice. The
`@c15t/ui/styles/components/<name>` class maps no longer import CSS. Vue
components import their `<name>.css` files directly and emit the same CSS as
before.

If your own components used those class maps to load CSS, import `styles.css`
once, or import the matching `<name>.css` file.
