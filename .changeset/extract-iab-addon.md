---
"c15t": minor
"@c15t/react": minor
"@c15t/iab": minor
---

feat: Extract IAB TCF to `@c15t/iab` addon package

IAB TCF 2.3 support is now an opt-in addon. Non-IAB users no longer pay for IAB code in their bundle.

**Breaking changes:**
- `IABConsentBanner`, `IABConsentDialog`, and `useHeadlessIABConsentUI` are no longer exported from `@c15t/react`. Import from `@c15t/react/iab` instead.
- IAB config now requires the `iab()` wrapper from `@c15t/iab` instead of a plain `{ enabled: true, ... }` object.

**Migration:**
```tsx
// Before
import { IABConsentBanner, IABConsentDialog } from '@c15t/react';
<ConsentManagerProvider options={{ iab: { enabled: true, cmpId: 28 } }}>

// After
import { iab } from '@c15t/iab';
import { IABConsentBanner, IABConsentDialog } from '@c15t/react/iab';
<ConsentManagerProvider options={{ iab: iab({ cmpId: 28 }) }}>
```

**Bundle impact for non-IAB users:**
- Core bundle: -3.0 KB gzip (-9.2%)
- Lazy chunks eliminated: -9.9 KB gzip
- Total: -12.9 KB gzip (-30%)
- `@iabtechlabtcf/core` removed from core dependencies
