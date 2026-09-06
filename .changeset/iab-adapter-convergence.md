---
'@c15t/react': patch
'@c15t/svelte': patch
'@c15t/vue': patch
'@c15t/ui': patch
---

The IAB banner and preference centre render the same DOM in every adapter.

Vue gets the `PreferenceItem` and `Tabs` primitives React and Svelte
already had, so its IAB rows carry the same slots, the same generated ids
and the same collapsing content — a closed row used to mount nothing at
all. Its IAB footers are action roots rather than wrappers around one, its
overlays are `aria-hidden` and carry the visible class, and the dialog's
close button reads "Close" from the core translations rather than the IAB
bundle, where the key never existed, so it had no accessible name.

Svelte's IAB preference centre is built from plain elements and the
package's own portal, focus-trap and scroll-lock actions rather than Ark's
dialog and collapsible, and its IAB switches use the shared switch
stylesheet like every other adapter's.

React stops faking a small switch with `transform: scale(0.75)` — it uses
the size the stylesheet has, which also restores the control's hit area —
translates the stack's partner count instead of hard-coding "partners",
and gives the partial-selection indicator real screen-reader text instead
of a `title`. The banner's "N partners" link and the dialog's close button
carry the test-ids the contract already declared.

`<IABConsentDialog>` takes an `initialTab` in all three, so a caller can
open the preference centre on the vendor list.

Vue reads its IAB copy through `useIabTranslations`, which fills the English defaults in underneath the active bundle the way React and Svelte already did, so a language file without `partnerSingular` still names its partners. The "Essential functions" trigger carries `aria-expanded` in all three, and the partial-selection text is hidden by the shared stylesheet rather than a class no adapter shipped.
