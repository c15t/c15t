---
packages:
  c15t: minor
  '@c15t/backend': minor
  '@c15t/core': minor
  '@c15t/schema': minor
---

### Add a Morocco cookie consent preset

`policyRulePresets.moroccoOptIn()` is available from `@c15t/schema`,
`@c15t/backend`, `@c15t/core` and `c15t`. It matches `MA` and follows CNDP
Deliberation D-939-2025 by asking for consent before personalized advertising
and social-sharing cookies. Non-profiling content personalization and
non-profiling audience measurement stay available before a choice.

The preset does not cover profiling, different-purpose interconnection or
foreign transfers. Those need separate CNDP authorization. Choice records
expire after 180 days, and the host remains responsible for D-939-2025's
information, declaration and cookie-retention duties.
