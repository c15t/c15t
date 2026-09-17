---
"@c15t/react-native": patch
---

The dialog's `Save Settings` action draws its label again. Every action carried `flex-grow: 1` over a `flex-basis: 0` so that the two decisions side by side come out the same width, which is web's `1fr 1fr`, but the same properties in the footer's own column make the zero basis the button's height: the accent action measured 18pt tall with no room for its label, which painted itself underneath the outline. The share of a row now belongs to the row's children (`CONSENT_BUTTON_ROW_ITEM`) and to nothing that stands on a row of its own.

That collapse was also why the card ran away. A grow on a footer child feeds back into the measure of the card above it, and a centred card that resolves taller than the overlay is not clipped, it is pushed up: on a 411x914 device the card came back 1090 tall and drew `Privacy Settings` over the status bar clock. The card now carries the cap the web card has, and the list reports its own height so it only becomes scrollable once it cannot fit, which is the same shape the web dialog has at 370x499 inside an 872 viewport.
