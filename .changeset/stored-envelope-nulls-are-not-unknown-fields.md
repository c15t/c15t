---
'@c15t/react-native': patch
---

Stop refusing a stored consent envelope over a null.

The Swift core rejected any stored envelope holding a key whose value was `null`, reading it as a field it did not recognise. Kotlin writes an absent optional as an explicit null, and so does a policy resolution carried through from the backend, which the core stores beside every decision. An iOS install that hit such a value therefore refused its own storage on every launch: the subject was asked again, the earlier answer read as if it had never been given, and nothing on the snapshot said why.

A key that holds null has nothing to lose by being unread, so it is no longer treated as unknown. The guard still refuses a field this build genuinely cannot represent, which is the case it was written for.
