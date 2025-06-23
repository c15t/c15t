# @c15t/cli

## 1.3.1

### Patch Changes

- 7fecb81: refactor(nextjs): fetch inital data from backend in c15t mode instead of duplicate logic
  fix: incorrect link to quickstart
  fix(issue-274): include nextjs externals in rslib
  fix(core): fall back to API call if initialData promise is empty
  chore: add translation for zh
- Updated dependencies [7fecb81]
  - @c15t/backend@1.3.1
  - @c15t/react@1.3.1

## 1.3.1-canary-20250618084038

### Patch Changes

- @c15t/backend@1.3.1-canary-20250618084038
- @c15t/react@1.3.1-canary-20250618084038

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
  - @c15t/backend@1.3.0
  - @c15t/react@1.3.0

## 1.2.2-canary-20250603153501

### Patch Changes

- Updated dependencies [e50e925]
  - @c15t/react@1.2.2-canary-20250603153501

## 1.2.2-canary-20250602152741

### Patch Changes

- Updated dependencies [131a2ff]
  - @c15t/backend@1.2.2-canary-20250602152741
  - @c15t/react@1.2.2-canary-20250602152741

## 1.2.2-canary-20250521133509

### Patch Changes

- Updated dependencies [e4b9778]
  - @c15t/backend@1.2.2-canary-20250521133509
  - @c15t/react@1.2.2-canary-20250521133509

## 1.2.2-canary-20250520100232

### Patch Changes

- 9b5684c: feat(cli): replace config.ts with inline config, @c15t/nextjs & various bug fixes

## 1.2.2-canary-20250514203718

### Patch Changes

- f24f11b: bump package
- Updated dependencies [f24f11b]
  - @c15t/backend@1.2.2-canary-20250514203718
  - @c15t/react@1.2.2-canary-20250514203718

## 1.2.2-canary-20250514183211

### Patch Changes

- Updated dependencies [f64f000]
  - @c15t/backend@1.2.2-canary-20250514183211
  - @c15t/react@1.2.2-canary-20250514183211

## 1.2.1

### Patch Changes

- Updated dependencies [[`aca32d3`](https://github.com/c15t/c15t/commit/aca32d3f0f76d75ad618a8ba3386ce385ac612e4)]:
  - @c15t/backend@1.2.1
  - @c15t/react@1.2.1

## 1.2.0

### Minor Changes

- [#224](https://github.com/c15t/c15t/pull/224) [`838a9b5`](https://github.com/c15t/c15t/commit/838a9b52c31326899ec3c903e43bf7bc31a6490f) Thanks [@BurnedChris](https://github.com/BurnedChris)! - Refactored backend to be a new orpc client / server

### Patch Changes

- Updated dependencies [[`838a9b5`](https://github.com/c15t/c15t/commit/838a9b52c31326899ec3c903e43bf7bc31a6490f), [`b1de2ba`](https://github.com/c15t/c15t/commit/b1de2baccd63295d49fb2868f63659f5ff48a9ce)]:
  - @c15t/backend@1.2.0
  - @c15t/react@1.2.0

## 1.0.8

### Patch Changes

- Updated dependencies [[`41bfb71`](https://github.com/c15t/c15t/commit/41bfb713c8a08dade25dabb5c4215fd2e3a59f40), [`1652d02`](https://github.com/c15t/c15t/commit/1652d02deaf003b2c533a44b733150c12561d531)]:
  - @c15t/react@1.1.5

## 1.0.7

### Patch Changes

- Updated dependencies [[`2d81c9f`](https://github.com/c15t/c15t/commit/2d81c9fc84ee960e46196dfd460407a925901a82)]:
  - @c15t/react@1.1.4

## 1.0.6

### Patch Changes

- Updated dependencies [[`e6a6765`](https://github.com/c15t/c15t/commit/e6a6765a9466d18d3b17e2f08151a63a655442a7)]:
  - @c15t/react@1.1.3

## 1.0.2

### Patch Changes

- [`92f94b6`](https://github.com/c15t/c15t/commit/92f94b65b1cab5e39591388e6bf6c1ccfdfd0121) Thanks [@BurnedChris](https://github.com/BurnedChris)! - fix: update telemetry API key for improved tracking

## 1.0.1

### Patch Changes

- [`08446ae`](https://github.com/c15t/c15t/commit/08446aef443a20a2262477a1dca3569d6bf672ad) Thanks [@BurnedChris](https://github.com/BurnedChris)! - # Removal of localstorage option in offline and custom

  - **Documentation**
    - Updated offline mode documentation to remove references to the `localStorageKey` configuration option.
  - **Bug Fixes**
    - Removed the ability to customize the localStorage key for storing consent data; a fixed key is now always used.
  - **Refactor**
    - Streamlined internal handling of localStorage keys by removing related configuration options and parameters.
  - **Tests**
    - Updated and removed tests related to custom localStorage key usage.

- Updated dependencies []:
  - @c15t/react@1.0.1
