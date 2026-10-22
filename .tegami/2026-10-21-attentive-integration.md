---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add Attentive integration

`attentiveTag` from `@c15t/integrations/attentive` loads the Attentive tag after `marketing` consent. Attentive cannot be stopped once it runs, so withdrawing consent reloads the page.
