---
"@c15t/backend": patch
"@c15t/react": patch
"c15t": patch
"@c15t/dev-tools": patch
"@c15t/schema": patch
---

fix(policy-packs): support multiple primary actions while keeping customize as the default primary action

Expose `primaryActions` consistently across schema, backend, core, React, and dev-tools. Built-in preset and offline default policies keep `customize` as the default primary action, while custom policies can now mark multiple actions as primary.
