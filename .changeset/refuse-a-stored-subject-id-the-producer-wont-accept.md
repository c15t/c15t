---
'@c15t/react-native': patch
---

Refuse a stored subject id the backend would never accept, and say so.

An install that carried a subject id in the lowercase UUID shape a prerelease minted could not recover: the native cores adopted that id on read while the producer requires `sub_` plus a base58 body, so every save was answered `400 INPUT_VALIDATION_FAILED` forever, the entry was requeued on each launch because a `400` looked retryable, and the device kept reporting the decision as committed.

The read side now holds the same rule as the write side. A stored id outside that shape is not adopted, the whole stored envelope goes with it, and the core comes up as a first launch rather than answering with a decision no one can query. It emits `subject-id-unusable` once, naming the id it refused, because a subject who is being asked again deserves a reason. Installs in that shape recover on their own now instead of failing silently and permanently.

The protocol fixtures carry real `sub_` ids, so the byte-exact save bodies they certify are bodies a c15t backend accepts.
