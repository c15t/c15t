---
"@c15t/react-native": patch
---

Consent surfaces now list the same categories the web dialog lists: `necessary`, then the resolved policy scope narrowed by the app's declared category scope, instead of every category the runtime happens to know about. The snapshot field the surfaces read used to carry the host's config verbatim, and with nothing configured the dialog and banner listed all five categories whatever the policy said, so one backend could answer four rows on web and five on mobile. Both native cores now make that decision the way the web kernel makes it: a host that declares nothing is asked about the whole scope, a name the resolved policy does not govern is dropped rather than shown, and while no policy has resolved the safe fallback rule's full set is listed. `snapshot.consentCategories` carries this list, `null` only for a core with no configuration installed, so the same backend and the same declaration list the same rows on both platforms.
