---
"@c15t/react": minor
"@c15t/nextjs": minor
"@c15t/translations": minor
---

Add consent-aware Google Maps and YouTube components for React and Next.js,
plus `useConsentScript` for building custom SDK integrations.

- `GoogleMap` keeps the Maps JavaScript API off the page until consent, shares
  one page-level loader across map instances, supports retries and loader
  configuration, and provides accessible blocked, loading, and error states.
- `YouTubeEmbed` keeps the iframe unmounted until consent and provides a
  responsive, privacy-enhanced embed with type-safe URL configuration.
- Add customizable `frame.loading` and `frame.error` messages for integration
  loading and failure states.
