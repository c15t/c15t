---
'@c15t/react': patch
---

Stop the `Slot` primitive from reading `element.ref`, which React 19 turned into a deprecation warning ("Accessing element.ref was removed in React 19") on every `asChild` render in development. The child ref is now read from `props.ref` on React 19 and from `element.ref` on React 16 to 18, in each case checking for React's warning getter first.
