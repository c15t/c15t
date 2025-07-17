# @c15t/react

## 1.4.4

### Patch Changes

- f6a3e5f: fix(core, react): translation overrides sometimes not set before banner is shown
- e3b9caf: fix(react): removed scroll lock from widget
- c44c22a: fix(react): improve cookie banner buttons on mobile
- Updated dependencies [f6a3e5f]
  - c15t@1.4.4

## 1.4.3

### Patch Changes

- c463eda: fix(react): ensure global themes from ConsentManagerProvider reach ConsentManagerDialog

## 1.4.3-canary-20250708133115

### Patch Changes

- 357dcd7: Fix theme inheritance in ConsentManagerWidget and ConsentManagerDialog

  ConsentManagerWidget and ConsentManagerDialog components now properly inherit themes from ConsentManagerProvider context, matching CookieBanner behavior. Previously, these components ignored global themes and only used local theme props.

  - Add explicit theme merging using useTheme() hook in ConsentManagerWidget
  - Add explicit theme merging using useTheme() hook in ConsentManagerDialog
  - Standardize CookieBanner to use same explicit theme merging pattern
  - Ensure local themes take precedence over global themes in all components
  - Maintain backward compatibility - no breaking changes to existing APIs

  This ensures that themes set in `ConsentManagerProvider` options.react.theme now properly flow to all components (Banner, Widget, and Dialog) while still allowing individual components to override with local themes.

## 1.4.2

### Patch Changes

- 53774ce: fix(react): improved provider rendering to stop request duplication
- Updated dependencies [53774ce]
  - c15t@1.4.2
  - @c15t/node-sdk@1.4.2

## 1.4.2-canary-20250702103734

### Patch Changes

- 797b0f7: fix(react): improved provider rendering to stop request duplication
- Updated dependencies [eed347c]
  - c15t@1.4.2-canary-20250702103734
  - @c15t/node-sdk@1.4.2-canary-20250702103734

## 1.4.1

### Patch Changes

- c15t@1.4.1
- @c15t/node-sdk@1.4.1

## 1.4.0

### Minor Changes

- 6eb9a8d: feat(core, react): added ignoreGeoLocation, improved provider props
  feat(core): added 'config' prop to store for better debugging
  fix(react): add aria label to cookie banner component
  fix(cli): removed env import
  fix(cli): asks for pkg manager twice

### Patch Changes

- Updated dependencies [6eb9a8d]
  - c15t@1.4.0

## 1.3.3

### Patch Changes

- b4d53be: feat(core): added Google Tag Manager support
  fix(react): allow trapFocus={false} in CookieBanner
  fix(nextjs): improved url validation
- Updated dependencies [b4d53be]
  - c15t@1.3.3

## 1.3.3-canary-20250624131627

### Patch Changes

- f13ad52: fix(react): allow trapFocus={false} in CookieBanner
- Updated dependencies [63200df]
  - c15t@1.3.3-canary-20250624131627

## 1.3.1

### Patch Changes

- 7fecb81: refactor(nextjs): fetch inital data from backend in c15t mode instead of duplicate logic
  fix: incorrect link to quickstart
  fix(issue-274): include nextjs externals in rslib
  fix(core): fall back to API call if initialData promise is empty
  chore: add translation for zh
- Updated dependencies [7fecb81]
  - @c15t/node-sdk@1.3.1
  - c15t@1.3.1

## 1.3.1-canary-20250618084038

### Patch Changes

- Updated dependencies [95edb35]
  - c15t@1.3.1-canary-20250618084038
  - @c15t/node-sdk@1.3.1-canary-20250618084038

## 1.3.0

### Minor Changes

- 85e5e3d: ## 🌍 New Translations Package

  - **NEW**: Added `@c15t/translations` package with comprehensive i18n support
  - Added translations for 8 languages: English, German, Spanish, Finnish, French, Italian, Dutch, Portuguese
  - Includes translations for consent banners, dialogs, and common phrases
  - Replaced the former `@c15t/middleware` package functionality

  ## 🔧 CLI Enhancements

  - **NEW**: Added telemetry system with framework and package manager detection
  - **NEW**: Enhanced onboarding flow with better framework detection (React, Next.js, etc.)
  - **NEW**: Automatic package manager detection (pnpm, yarn, npm)
  - **NEW**: Added `--telemetry-debug` flag for debugging telemetry
  - Improved error handling and user experience during setup
  - Better file generation for different storage modes and configurations

  ## 🎯 Backend Updates

  - **NEW**: Server-side translation support in consent banner handling
  - Added language detection from `Accept-Language` headers
  - Updated consent banner contracts to include translation schemas
  - Enhanced jurisdiction checking with better default handling
  - Updated user agent and IP address handling (now defaults to null instead of "unknown")

  ## ⚛️ React Package Changes

  - **NEW**: Integrated translation support throughout components
  - Updated `ConsentManagerProvider` to handle initial translation configuration
  - Removed dependency on middleware package
  - Enhanced consent manager store with translation capabilities

  ## 🔄 Next.js Package Restructuring

  - **BREAKING**: Removed middleware exports and functionality
  - **NEW**: Added `ConsentManagerProvider` component for server-side rendering
  - **NEW**: Server-side consent banner detection with jurisdiction mapping
  - Added support for extracting consent-relevant headers
  - Updated to work with new translations system

  ## 🏗️ Core Package Updates

  - **NEW**: Integrated translation configuration system
  - Updated offline client to include default translations
  - Enhanced consent banner fetching with translation support
  - Improved store management with initial data handling

  ## 🔄 Infrastructure & Tooling

  - **NEW**: Added GitHub Actions workflow for canary releases
  - **NEW**: Added branch synchronization workflow (main → canary)
  - Updated BiomeJS configuration with comprehensive linting rules
  - Enhanced build configurations across packages

  ## 📦 Package Management

  - Updated dependencies across all packages
  - Added peer dependencies where appropriate
  - Improved module exports and build configurations
  - Enhanced TypeScript configurations for better type safety

  ***

  ## 📋 Detailed Change Breakdown

  ### **New Features**

  - Added multi-language support for consent banners with new translations in German, Spanish, Finnish, French, Italian, Dutch, and Portuguese.
  - Consent banner logic enhanced to detect user location and language from HTTP headers, showing localized messages per jurisdiction.
  - Next.js ConsentManagerProvider now performs server-side initialization of consent state for consistent banner display and translation.
  - CLI onboarding improved with robust environment detection, modularized flow, enhanced telemetry, and guided dependency installation.
  - Introduced new CLI global flag for telemetry debug mode.

  ### **Improvements**

  - Consent banner responses now include detailed translation structures and jurisdiction information.
  - Translation utilities and types centralized in a new `@c15t/translations` package for easier integration.
  - Onboarding file generation refactored to unify client config and environment file creation.
  - Documentation and changelogs updated for new canary releases and integration guidance.
  - CLI telemetry enhanced with asynchronous event tracking and debug logging support.

  ### **Bug Fixes**

  - Fixed consent banner logic for correct handling of US jurisdiction and fallback scenarios.
  - Improved error handling and debug logging in CLI telemetry and onboarding.

  ### **Refactor**

  - Removed legacy middleware exports and Node SDK re-exports from Next.js and middleware packages.
  - Consolidated jurisdiction and consent banner logic into dedicated Next.js consent-manager-provider modules.
  - Updated CLI context creation to async with enriched environment metadata and improved logging.
  - Refactored onboarding storage modes to delegate file generation and unify cancellation handling.

  ### **Tests**

  - Added extensive tests for consent banner display logic, jurisdiction detection, language preference parsing, and translation selection.
  - Removed deprecated tests for deleted middleware and jurisdiction modules.

  ### **Chores**

  - Updated package versions and dependencies to latest canary releases, including addition of `@c15t/translations`.
  - Added and updated GitHub Actions workflows for canary releases and branch synchronization.
  - Updated package metadata and configuration files for consistency and improved build settings.

  This release represents a major step forward in internationalization support, developer experience improvements, and architectural refinements across the entire c15t ecosystem.

### Patch Changes

- Updated dependencies [85e5e3d]
  - c15t@1.3.0
  - @c15t/node-sdk@1.3.0

## 1.2.2-canary-20250603153501

### Patch Changes

- e50e925: refactor(core, nextjs): removed use of cookies
  fix(nextjs): pass through promise instead of blocking the app
  feat(react, core): added ability to use server-side translations from show-consent-banner endpoint
- Updated dependencies [e50e925]
  - c15t@1.2.2-canary-20250603153501

## 1.2.2-canary-20250602152741

### Patch Changes

- c15t@1.2.2-canary-20250602152741
- @c15t/node-sdk@1.2.2-canary-20250602152741

## 1.2.2-canary-20250521133509

### Patch Changes

- c15t@1.2.2-canary-20250521133509
- @c15t/node-sdk@1.2.2-canary-20250521133509

## 1.2.2-canary-20250514203718

### Patch Changes

- f24f11b: bump package
- Updated dependencies [f24f11b]
  - c15t@1.2.2-canary-20250514203718
  - @c15t/node-sdk@1.2.2-canary-20250514203718

## 1.2.2-canary-20250514183211

### Patch Changes

- f64f000: feat: added @c15t/nextjs, @c15t/translations for better integration, server-side translations & fetching of consent banner
- Updated dependencies [f64f000]
  - @c15t/node-sdk@1.2.2-canary-20250514183211
  - c15t@1.2.2-canary-20250514183211

## 1.2.1

### Patch Changes

- Updated dependencies []:
  - c15t@1.2.1

## 1.2.0

### Minor Changes

- [#224](https://github.com/c15t/c15t/pull/224) [`838a9b5`](https://github.com/c15t/c15t/commit/838a9b52c31326899ec3c903e43bf7bc31a6490f) Thanks [@BurnedChris](https://github.com/BurnedChris)! - Refactored backend to be a new orpc client / server

### Patch Changes

- [#222](https://github.com/c15t/c15t/pull/222) [`b1de2ba`](https://github.com/c15t/c15t/commit/b1de2baccd63295d49fb2868f63659f5ff48a9ce) Thanks [@KayleeWilliams](https://github.com/KayleeWilliams)! - fix(core, react): added "common" translations, removed widget translations

- Updated dependencies [[`838a9b5`](https://github.com/c15t/c15t/commit/838a9b52c31326899ec3c903e43bf7bc31a6490f), [`b1de2ba`](https://github.com/c15t/c15t/commit/b1de2baccd63295d49fb2868f63659f5ff48a9ce)]:
  - c15t@1.2.0

## 1.1.5

### Patch Changes

- [#208](https://github.com/c15t/c15t/pull/208) [`41bfb71`](https://github.com/c15t/c15t/commit/41bfb713c8a08dade25dabb5c4215fd2e3a59f40) Thanks [@KayleeWilliams](https://github.com/KayleeWilliams)! - fix(react): no style component theme not removing default classes

- [#218](https://github.com/c15t/c15t/pull/218) [`1652d02`](https://github.com/c15t/c15t/commit/1652d02deaf003b2c533a44b733150c12561d531) Thanks [@KayleeWilliams](https://github.com/KayleeWilliams)! - fix(react): removed layers to fix collision with Tailwind 3

## 1.1.4

### Patch Changes

- [#207](https://github.com/c15t/c15t/pull/207) [`2d81c9f`](https://github.com/c15t/c15t/commit/2d81c9fc84ee960e46196dfd460407a925901a82) Thanks [@KayleeWilliams](https://github.com/KayleeWilliams)! - fix(core, react): translations not working

- Updated dependencies [[`2d81c9f`](https://github.com/c15t/c15t/commit/2d81c9fc84ee960e46196dfd460407a925901a82)]:
  - c15t@1.1.4

## 1.1.3

### Patch Changes

- [#204](https://github.com/c15t/c15t/pull/204) [`e6a6765`](https://github.com/c15t/c15t/commit/e6a6765a9466d18d3b17e2f08151a63a655442a7) Thanks [@KayleeWilliams](https://github.com/KayleeWilliams)! - fix(react): theme overrides & color scheme improvements

- Updated dependencies [[`4d47e21`](https://github.com/c15t/c15t/commit/4d47e2109bfc894f1666b19f4ff40d7398f10c57)]:
  - c15t@1.1.3

## 1.0.1

### Patch Changes

- Updated dependencies [[`08446ae`](https://github.com/c15t/c15t/commit/08446aef443a20a2262477a1dca3569d6bf672ad)]:
  - c15t@1.0.1

## 1.0.0-rc.1

### Patch Changes

- Refactored package.json imports

## 0.0.1-beta.10

### Patch Changes

- all build tools now use rslib + new formatting from biomejs
- Updated dependencies
  - c15t@0.0.1

## 0.0.1-beta.9

### Patch Changes

- 1912aa9: Refactored codebase to use Ultracite Biome Config for stricter linting
- Updated dependencies [1912aa9]
  - c15t@0.0.1-beta.9
