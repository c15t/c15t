---
packages:
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Ship only the styles the script-tag surfaces use

`c15t.js` and `c15t.iab.js` keep only the `@c15t/ui` rules that the banner,
preference dialog, trigger and IAB surfaces can match. `c15t.js` is about
4.3 KB smaller gzipped and `c15t.iab.js` about 7.6 KB. `c15t.css` and
`c15t.iab.css` shrink the same way. Rendering is unchanged.
