---
'@c15t/react-native': patch
---

Centre a `link` button in the row it shares with a filled button. `ConsentBanner` puts `Customize` beside `Reject All` when the row has room, and the link's label sat at the top of that row instead of on its middle line. The footer is a wrapping flex row, which stretches its items by default, so the link's box grew to the height of the button beside it while the text stayed at the top of the box. A link is the one control whose theme part is also its label: `captionLink` styles the box and the run of text at once, so vertical centreing and a 44-point floor could not live there without stretching the text itself. `ConsentButton` now supplies both for `kind="link"`, and holds the link at its content width so a growing sibling cannot squeeze a long translated label. Primary and secondary buttons keep dressing themselves through their parts.
