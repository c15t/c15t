---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add Capless analytics

Load Capless web analytics and session replay only after measurement consent
with the `caplessAnalytics` helper. Once consent is given, calls to
`window.capless` made before the tracker loads are replayed. Withdrawing
consent calls `capless('optout')`, and every granted load calls
`capless('optin')` first, so an earlier withdrawal does not leave a returning
visitor opted out. The CLI can generate the integration.
