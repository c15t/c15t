---
'@c15t/react-native': minor
---

Re-measure the banner against the running web surfaces rather than against screenshots. Three of the numbers below are the difference between a card that is 238 tall and one that is 271.6, which is what the stale captures left on screen.

The accent sits on `Customize`. `ConsentButton` dressed `Reject All` and `Accept All` in it, which is what the captures appear to show and the opposite of the shipped surfaces: `packages/core` defaults `primaryActions` to `customize` so the two decisions stay neutral together and the prompt does not lean a subject either way, and the live banner draws the accent outline and label on `Customize`. Both decisions are now `secondary`. A bare notice still promotes its only action, because there is nothing to customise on one.

A consent action draws the web box: 8pt vertical and 12pt horizontal padding around a 14pt label, which is 35.5 tall. It was 44.2, because the platform tap minimum was applied to `minHeight`. `MIN_TAP_TARGET` still holds, on the `hitSlop` the `Pressable` gets, derived from the padding, line height, and border of the parts in force, so a host theme with a taller label asks for a smaller inset and one that already clears 44 asks for none. No built-in control sets `minHeight` any more, which also means a 3x label sets its own line box instead of fighting a fixed floor.

The footer band steps 8 between its action rows, not 16. `.actionRoot` does open at `1rem`, but every surface with two action groups carries `[data-split]`, which drops it to `0.5rem`; row to row the web footer measures 8.0.

The card sits one gutter above the bottom safe-area band rather than a gutter plus a control height. On a phone with a home indicator the old layer left the banner 88 above the bottom edge of the screen where the web card sits 16 above the viewport edge. `MIN_TAP_TARGET` survives as the band floor for hosts that report no insets at all, which is unchanged.

A heading carries the web's tracking. Both web surfaces set `letter-spacing` in `em` and React Native only takes an absolute length, so the part now carries the product: -0.176 on the 16pt banner heading, -0.35 on the 14pt dialog one. It is a per-surface number rather than a type-scale field, because the dialog and the preference centre disagree about their heading and the scale hands them the same one.

`web-measured-parity.test.tsx` pins these, and is deliberately the other half of `web-token-parity.test.ts`: that file reads what `packages/ui` publishes as a token, and this one measures the geometry that has no token to be diffed against. The safe-area assertions that assumed the old reserve now assert the gutter, and the 44pt guarantee moved to hit-area assertions.
