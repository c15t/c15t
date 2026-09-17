---
"@c15t/react-native": patch
---

Deliver a queued consent save once on Android, however many threads ask for a replay. `flushPending` is public and synchronous, and the shipped wiring reaches it from a launch, a foreground transition, a network wake-up, a React Native `refresh`, and a save's own first send. A pass reads the queue once and then sends entry by entry, so any two of those resended whatever was still in flight when the later one read. The frozen bytes carry the same consent id, so the backend deduped them and nothing in stored state was wrong: the only trace was a second POST for a decision the subject had already seen delivered. Delivery now takes one guard per core, a request that arrives mid-pass is answered by the pass already running, and a sender asks the queue whether an entry is still owed immediately before it sends.
