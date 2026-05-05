# @c15t/iab

## 2.0.5

### Patch Changes

- c15t@2.0.5

## 2.0.4

### Patch Changes

- Updated dependencies [748536a]
  - @c15t/schema@2.0.1
  - c15t@2.0.4

## 2.0.0

### Major Changes

- 32617c9: Changelog available at https://c15t.com/changelog/2026-04-14-v2.0.0

### Patch Changes

- Updated dependencies [32617c9]
- Updated dependencies [32617c9]
  - c15t@2.0.0
  - @c15t/schema@2.0.0

## 2.0.0-rc.10

### Patch Changes

- Updated dependencies [9579b62]
  - c15t@2.0.0-rc.10
  - @c15t/schema@2.0.0-rc.6

## 2.0.0-rc.8

### Patch Changes

- Updated dependencies [43f1b68]
- Updated dependencies [3d4c107]
- Updated dependencies [c944e35]
- Updated dependencies [3d5b0fd]
- Updated dependencies [5956531]
  - c15t@2.0.0-rc.8
  - @c15t/schema@2.0.0-rc.5

## 2.0.0-rc.6

### Minor Changes

- e08e52c: feat: Extract IAB TCF to `@c15t/iab` addon package

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

### Patch Changes

- Updated dependencies [e08e52c]
- Updated dependencies [bb3ab0f]
- Updated dependencies [1a724fc]
  - c15t@2.0.0-rc.6
  - @c15t/schema@2.0.0-rc.4
