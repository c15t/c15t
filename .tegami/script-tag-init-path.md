---
packages:
  '@c15t/schema': patch
  'c15t': patch
  '@c15t/ui': patch
  '@c15t/browser': patch
---

### Show the script-tag banner without waiting on the collator or a forced layout

Two costs sat on the main thread between `c15t.js` arriving and the banner
showing. Canonical sets and fingerprint keys were sorted with
`String.prototype.localeCompare`, whose first call initialises the ICU
collator. They now use a comparator that applies the same root-collation
order to printable ASCII directly and only falls back to the collator for
other strings, so every fingerprint stays byte-identical. The banner and
preference dialog also inserted their hidden state, forced a layout and
flipped to the visible state to start the entry transition. In browsers with
`@starting-style` they now insert visible with an entering state the
stylesheet transitions from, with no layout read; older browsers keep the
flip. `@c15t/ui` adds the `bannerEntering`, `overlayEntering`,
`dialogEntering` and `contentEntering` classes that carry those states.
