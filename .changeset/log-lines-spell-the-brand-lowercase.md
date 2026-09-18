---
"@c15t/react-native": patch
---

Spell the brand lowercase in the iOS spec-check log lines. The three `RCTLogError` calls that compare the bridge against the generated `NativeC15tSpec` protocol prefixed their messages `C15t:`, while every other message in the SDKs, including the `NSLog` in the same bridge, already prefixes `c15t:`. The prefix is prose, so it now matches the brand; the `C15t` TurboModule name and the protocol and class names in those messages are unchanged.
