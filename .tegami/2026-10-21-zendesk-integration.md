---
packages:
  '@c15t/integrations': minor
  '@c15t/scripts': patch
  '@c15t/cli': patch
---

### Add Zendesk Messaging consent integration

`zendeskWidget()` loads Zendesk Messaging only after `functionality` consent. Includes configuration and revocation guidance, loader contract tests, and CLI setup support.

Equivalent configurations share the active widget lifecycle. Provider cleanup preserves granted conversations. Consent withdrawal sends the `none` storage range once no shared registration grants the widget.

Give each widget key its own loader resource identity so independent loaders cannot adopt another key's script. Document the single-widget-per-page requirement and the complete Admin Center path to the widget key.
