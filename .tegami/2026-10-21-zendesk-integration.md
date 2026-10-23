---
packages:
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
  "@c15t/scripts":
    replay:
      - exit-prerelease(npm:@c15t/scripts)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Add Zendesk Messaging consent integration

`zendeskWidget()` from `@c15t/integrations/zendesk` loads Zendesk Messaging only after `functionality` consent. It sets Zendesk's cookie range to `all` with measurement consent and `functional` without it. On revocation it sends `none`, which hides the widget and clears its storage. The CLI can add it during setup. See [Other chat and support tools](https://c15t.com/docs/integrations/other-chat-and-support#zendesk-messaging).
