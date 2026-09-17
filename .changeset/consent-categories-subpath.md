---
"c15t": minor
"@c15t/core": minor
"@c15t/react-native": patch
---

Add `@c15t/core/consent-categories`, a subpath that exports `CONSENT_CATEGORIES` and `OPTIONAL_CONSENT_CATEGORIES` on their own.

`@c15t/react-native` needed those two arrays and nothing else at runtime; every other type it takes from `@c15t/core` is a type import, which costs nothing. A bundler cannot tell the difference at the barrel, so importing it pulled the kernel, the schema, and the translations into every React Native app for the sake of two string arrays: 389,639 B raw and 90,701 B gzipped across 131 modules, against 74,507 B and 14,956 B across 48 modules now. Cold launch to a readable consent snapshot fell from 31.6 ms to 10.9 ms in the same step.
