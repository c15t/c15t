---
packages:
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Fix generated React and Next.js styles

`c15t setup` renders theme preset tokens with `ConsentTheme` and uses important
utility modifiers for the Tailwind CSS 3 preset. Choosing None keeps the
default c15t theme. Setup finds global stylesheets through tsconfig or jsconfig
aliases and warns when it can't find one.

For Tailwind CSS 4 and plain CSS apps, the starter margin and padding reset
moves into the base layer, so it no longer collapses the banner and dialog.
