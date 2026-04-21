---
"@c15t/scripts": patch
---

Fix vendor bootstrap queue payloads so Google, Meta Pixel, and X Pixel receive
real `arguments` objects instead of flattened arrays, and add contract tests for
all shipped script helpers to verify their load-time handshakes.
