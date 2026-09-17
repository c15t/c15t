---
'@c15t/react-native': patch
---

Draw a closed category card at the web's 42 rather than 60. On a 411x914 device every row measured 59.8 to 60.2 tall and 74 apart, where `accordion.module.css` draws 42 with a 12 gap between cards.

Two numbers were in the way, and both are the 44pt tap minimum drawn as layout. The trigger row's `minHeight` carried the web's disclosure floor as a bare 24, which is a content-box figure and React Native reads `minHeight` as the border box, so it held nothing; the row was being set instead by the 44pt box the switch laid around its own track, and a row is only as tall as the tallest thing inside it. The part now carries the floor with the padding added back -- 40, which with the card's two hairlines is the web's 42 -- and the track lays out at its visible 28x16 with its reach on `hitSlop`, 14 past each edge and 8 past each end. That is the same ground the old box covered, so the switch loses no tap and gains nothing you can see; the label simply stops having 16pt eaten by an invisible wrapper.

The row reaches the fingertip floor the way the actions already do, through a `hitSlop` derived from the parts in force: a host theme that puts a taller row through `categoryTrigger` asks for a smaller inset, and one that already clears 44 asks for none. A 3x system label raises the drawn box to the label's own line height rather than being clipped to the design's height.

The bare demo's consent manager no longer passes `onOpenPreferences`, which drew a fourth footer action the web dialog does not offer. The prop stays on the component, and the app keeps its own route into `ConsentPreferences`.
