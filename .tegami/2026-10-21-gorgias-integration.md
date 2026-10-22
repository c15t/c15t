---
packages:
  '@c15t/integrations': minor
  '@c15t/scripts': patch
  '@c15t/cli': patch
---

### Add Gorgias Chat consent integration

`gorgiasChat()` from `@c15t/integrations/gorgias` loads Gorgias Chat only after `functionality` consent. Without `measurement` consent it turns off the widget's Segment analytics. Gorgias has no shutdown API, so revocation relies on c15t's page reload. The CLI can add it during setup. See [Other chat and support tools](https://c15t.com/docs/integrations/other-chat-and-support#gorgias-chat).
