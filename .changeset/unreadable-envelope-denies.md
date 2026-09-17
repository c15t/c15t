---
"@c15t/react-native": patch
---

Refuse a stored consent envelope rather than read it halfway. Both native cores now treat an envelope carrying a field this build does not model as nothing stored, next to the truncated write and the pre-correction shape they already refused, and answer exactly as a fresh install: nothing applied, every optional category denied, and the next `/init` resolving the policy again. Kotlin skipped unknown keys before and kept the rest of the payload, so the unrecognised field vanished on the next write; its stored codec now rejects it outright. A device already holding such an envelope loses the consent stored in it and is asked again.
