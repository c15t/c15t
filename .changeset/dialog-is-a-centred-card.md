---
"@c15t/react-native": minor
---

`ConsentDialog` and `ConsentPreferences` take a `presentation` prop, and the default is `dialog`: the card sits in the middle of the overlay with the web overlay's 16pt gutter on all four sides, capped at the web card's 448pt width, and drawn with the dialog's own 1px border and `0 1px 2px 0 rgba(0, 0, 0, 0.05)` elevation. `presentation="sheet"` is the bottom-anchored card, and it is the only surface that still draws a grab handle: a centred card has nothing to drag. The actions below it dropped the rule they used to sit under. The banner keeps its `#FAFAFA` band and hairline because that band is a fact about the web footer; a card surface has nothing to separate from itself.

A category card is closed until the subject opens it, which is what the web accordion does and what keeps five categories on one screen: 42pt closed rather than 110. The row is the control, so the label, the plus, and the space between them all open the card, while the switch inside the row keeps its own tap and does not double as a disclosure. The revealed description is the accordion's own 14/21 copy in a tone a step under the muted text, so a card that is open does not shout over the headings around it.

The accent moved onto `Save Settings` on both card surfaces and `Reject All` and `Accept All` came back to the neutral outline, which is the split the kernel already draws for a preference surface. The preference centre stopped rendering a fourth `Dismiss` button: the web centre offers three actions, and leaving is already covered by the scrim, the back gesture, and the escape key. Every action also picked up the web's `shadow-sm`, and the accent one is a 2pt accent outline rather than 1pt, paid for out of its own padding so both variants draw the same 35.5pt box.

The switch thumb is a ring rather than a filled disc: 1px of the border token around it, and a 4pt hole in the middle that shows the track through it. A category the subject cannot move gets the smaller 8pt thumb with the ring dropped, on a track faded to 40%, which is the whole reason `Strictly Necessary` reads as paler than the rows a subject decides.

`ConsentThemeColors` gains `contentText`, and `CONSENT_THEME_PARTS` gains `categoryContent`, `categoryDisclosure`, `categoryTrigger`, and `brandingWordmark` for the wordmark's own tracking.
