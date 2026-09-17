---
'@c15t/react-native': patch
---

Refuse an iOS consent save that cannot promise to deliver it, and announce a queued one that stops being owed.

`committed` from the Swift core meant the app had applied a decision. It now means the decision is applied, written to protected storage, and backed by a durable queue entry holding the exact bytes that owe delivery. The queue write lands before the snapshot moves, so a save that cannot take on its obligation is refused and leaves the decision where it was instead of reporting success with nothing on the device remembering that anyone had to be told.

What happens to a send that fails is the other half. The queue replays frozen bytes, so a refusal that came from reading those bytes says the same thing on the eleventh try as on the first: a `400 INPUT_VALIDATION_FAILED`, or a contract declaration this build cannot speak, now drops the entry and names the producer's reason. Every failed send spends an attempt, including the save's own first send, and an entry released for running out of attempts or out of its retention window is announced rather than quietly gone. A body that refused for those reasons used to be replayed on every launch, forever, while every one of those replays was itself rejected.
