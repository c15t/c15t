---
'@c15t/core': patch
---

Change the default consent action layout to `[['reject', 'accept'], 'customize']` on one row, with `uiProfile` defaulting to `compact` and `customize` as the default primary action. Without any `presentation` config the banner now shows reject and accept side by side on the left as neutral buttons and a primary customize on the right, and the preference footer shows reject and accept with save on the right. Before, the default was every allowed action in alphabetical order stretched to full width and stacked. Pass `presentation.prompt` or `presentation.preferences` to keep a stacked layout, for example `{ uiProfile: 'balanced' }`.
