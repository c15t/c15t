---
"@c15t/core": patch
"@c15t/schema": patch
---

Preserve refusals across policy updates and correct regional preset matching.

- Suppress automatic choice prompts while an in-scope refusal or honored privacy opt-out applies. New categories and expired grants cannot trigger another Accept All request. Opt-in permissions still require valid grants, and users can reopen preferences themselves.
- Match separately geocoded EU territories and Gibraltar in the Europe presets. Keep Gibraltar outside the EEA and UK matcher groups.
- Let explicit country rules handle missing subdivisions before falling back. Without a country rule or fallback, missing regional inputs deny optional categories and require a choice for visitors without refusals.
- Clarify UK statistics conditions, Malaysia business scope and current cookie guidance, Swiss exclusions, Japan service scope, India commencement sources, and upcoming US laws.
