---
packages:
  '@c15t/browser': patch
---

### Ship only the styles the script-tag surfaces use

`c15t.js` and `c15t.iab.js` inline `@c15t/ui`'s stylesheet, which also styles
surfaces this package never renders: the headless primitives, the vendor list,
tabs and collapsible parts outside the IAB dialog, and the ConsentGate
placeholder. The build now keeps only the rules that can match the class maps
the banner, preference dialog, trigger and IAB surfaces render. `c15t.js` is
about 4.3 KB smaller gzipped and `c15t.iab.js` about 7.6 KB. `c15t.css` and
`c15t.iab.css`, the same sheets for light-DOM mounts, shrink the same way.
Rendering is unchanged.
