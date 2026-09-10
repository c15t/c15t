---
title: Intercom messenger
description: Load the Intercom messenger with functionality permission and
  configure its region.
group: integrations
---

## Register the messenger

```ts
import { intercom } from '@c15t/scripts/intercom';

export const scripts = [intercom({ appId: 'your-app-id' })];
```

Pass `scripts` to the existing provider or loader. The helper uses the
`functionality` category and defaults to Intercom's US API base. Set `apiBase`
when your workspace uses another region. Optional serializable `settings` are
merged into `window.intercomSettings`.

## Verify identity and lifecycle

Remove an existing Intercom plugin or snippet. Test that the messenger waits
while functionality permission is denied under your policy. Check later login,
logout and user changes separately from consent initialization. Do not leave
previous-user identity in an application-controlled SDK session.

Revoking permission cannot erase a request already sent. Verify the vendor's
shutdown and future event behavior for your configuration, then run the checks
in [verification](../guides/verify-consent.md).
