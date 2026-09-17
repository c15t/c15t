---
"@c15t/react-native": patch
---

Stop installing the JavaScript consent kernel in a mobile app. `@c15t/react-native` listed `@c15t/core` as a dependency, so every app installed, bundled and type-checked a browser consent engine that never runs on a device, and its published declaration files named that package. The consent vocabulary now ships with the mobile package, so the snapshot, gate, prompt and action types come from `@c15t/react-native` alone, together with the category names and the `CONSENT_CATEGORIES` and `OPTIONAL_CONSENT_CATEGORIES` tables. `@c15t/core` stays a development dependency, where it is the reference those types are checked against: a test compares the vocabulary with the kernel and with the spellings the Swift and Kotlin cores declare, and the publish check rejects a manifest or build output that mentions the kernel again.
