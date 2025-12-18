# @c15t/react

## 1.8.3-canary-20251218133143

### Patch Changes

- 226f45c: fix(react): custom styling support for dialog and accordion
- Updated dependencies [9eff7a7]
- Updated dependencies [b7fafe6]
  - c15t@1.8.3-canary-20251218133143

## 1.8.2

### Patch Changes

- 2ce4d5a: \* feat(core): Added ability to disable c15t with the `enabled` prop. c15t will grant all consents by default when disabled as well as loading all scripts by default. Useful for when you want to disable consent handling but still allow the integration code to be in place.
  - fix(react): Frame component CSS overriding
  - fix(react): Legal links using the asChild slot causing multi-child error

  https://c15t.com/changelog/2025-12-12-v1.8.2

- Updated dependencies [2ce4d5a]
  - c15t@1.8.2

## 1.8.2-canary-20251212163241

### Patch Changes

- Updated dependencies [a368512]
  - c15t@1.8.2-canary-20251212163241

## 1.8.2-canary-20251212112113

### Patch Changes

- 7284b23: feat(core): add ability to disable c15t
- dfd5e4f: fix(react): frame css overiding
- Updated dependencies [7284b23]
  - c15t@1.8.2-canary-20251212112113

## 1.8.2-canary-20251210222051

### Patch Changes

- a03d607: fix(react): legal links using the asChild slot causing multi-child error

## 1.8.2-canary-20251210105424

### Patch Changes

- 3eb3f4a: fix(react): hydration error when wrapped in an SSR component

## 1.8.1

### Patch Changes

- Updated dependencies [0f55bf2]
  - c15t@1.8.1

## 1.8.0

### Minor Changes

- 68a7324: Full Changelog: https://c15t.com/changelog/2025-10-27-v1.8.0

### Patch Changes

- Updated dependencies [68a7324]
  - c15t@1.8.0

## 1.8.0-canary-20251112105612

### Minor Changes

- 7043a2e: feat: add configurable legal links to consent banner and consent dialog
- bee7789: feat(core): identify users before & after consent is set
  feat(backend): add endpoint to identify subject with consent ID
  refactor(core): improved structure of client API & removed unused options
- 69d6680: feat: country, region & language overrides

### Patch Changes

- 31953f4: refactor: improve package exports ensuring React has same exports as core
- 6e3034c: refactor: update rslib to latest version
- Updated dependencies [31953f4]
- Updated dependencies [7043a2e]
- Updated dependencies [6e3034c]
- Updated dependencies [bee7789]
- Updated dependencies [b3df4d0]
- Updated dependencies [69d6680]
  - c15t@1.8.0-canary-20251112105612

## 1.8.0-canary-20251028143243

### Minor Changes

- a0fab48: feat(core): cookie/local-storage hybrid approach

### Patch Changes

- 067c7af: fix(react): frame component hydration error
- Updated dependencies [8f3f146]
- Updated dependencies [a0fab48]
  - c15t@1.8.0-canary-20251028143243

## 1.7.0

### Minor Changes

- aa16d03: You can find the full changelog at https://c15t.com/changelog/2025-10-11-v1.7.0

### Patch Changes

- Updated dependencies [aa16d03]
  - c15t@1.7.0

## 1.7.0-canary-20251014174050

### Patch Changes

- 87ce89f: fix(react): missing use-client causing build errors in Next.js 14

## 1.7.0-canary-20251012181938

### Minor Changes

- 0c80bed: feat: added script loader, deprecated tracking blocker
- a58909c: feat(react): added frame component for conditionally rendering content with a placeholder e.g. iframes
  feat(core): added headless iframe blocking with the data-src & data-category attributes
  fix(react): improved button hover transitions when changing theme

### Patch Changes

- Updated dependencies [0c80bed]
- Updated dependencies [a58909c]
  - c15t@1.7.0-canary-20251012181938

## 1.6.1

### Patch Changes

- 6257a20: fix(react): dialog scroll lock persisting after closure

## 1.6.0

### Minor Changes

- 84ab0c7: For a full detailed changelog see the [v1.6.0 release notes](https://c15t.com/changelog/2025-09-08-v1.6.0).

### Patch Changes

- Updated dependencies [84ab0c7]
  - c15t@1.6.0
