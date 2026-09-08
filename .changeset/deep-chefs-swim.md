---
"@c15t/schema": minor
"@c15t/core": minor
"@c15t/react": patch
---

Add researched regional consent presets and scoped statistics configurations.

- Offer US privacy states opt-in and opt-out variants for the same 20 states, with GPC handling. Opt-out has no automatic banner; set `prompt: 'notice'` when the host needs a notice.
- Add Australia, Japan and Canada opt-out variants alongside opt-in. Canada excludes Quebec and defaults to a notice. Retain the Swiss no-prompt option with corrected processing assumptions.
- Add UK service-statistics and Malaysia statistics-only presets. Only reviewed measurement is allowed; advertising and other optional categories remain denied.
- Use `i18n.messageProfile: 'preferences'` for generic international preference labels in stock banners and the React toolbar.
- Treat a missing subdivision as insufficient location data when regional rules exist. Use an explicit country rule when provided, otherwise the configured fallback, or fail with optional categories denied and a choice prompt; known uncovered locations still use the explicit default.
- Document country-specific bases, contextual opt-out recipes, processing limits and independent permissions. Mixed exempt-analytics/consent-advertising defaults and timed deemed consent remain unsupported.
