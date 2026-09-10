---
title: Google Maps
description: Prevent a map iframe from mounting before the required permission.
group: integrations
---

## Put the iframe inside Frame

This React example uses `Frame` inside an existing consent provider. A Next.js
Client Component can import the same component from `c15t/next`.

```tsx
import { Frame } from 'c15t/react';

export function Map({ embedURL }: { embedURL: string }) {
  return (
    <Frame category="functionality">
      <iframe
        src={embedURL}
        title="Map showing our office location"
        width="600"
        height="450"
        loading="lazy"
        style={{ border: 0, width: '100%' }}
      />
    </Frame>
  );
}
```

Supply the map's embed URL and choose the category that matches its use in your
application. `Frame` does not mount children until permission allows them.
`loading="lazy"` alone is a performance hint and does not provide consent gating.

## Verify before and after permission

On a fresh opt-in session, inspect Network and confirm the iframe has not
requested the map. Grant the category and confirm the map mounts. Revoke it and
check the frame returns to its blocked state. Keep useful fallback information,
such as the address and directions link, available outside the map.

For a JavaScript Maps SDK instead of an iframe, register a category-gated script
and manage the widget's cleanup. Do not use this iframe recipe as evidence that
an independently loaded Maps SDK is blocked.
