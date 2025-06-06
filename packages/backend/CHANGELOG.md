# @c15t/backend

## 1.3.0-canary-20250606152615

### Minor Changes

- ef30987: ## 🌍 New Translations Package

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

- Updated dependencies [ef30987]
  - @c15t/translations@1.3.0-canary-20250606152615

## 1.2.2-canary-20250602152741

### Patch Changes

- 131a2ff: fix(backend): user agent not being stored

## 1.2.2-canary-20250521133509

### Patch Changes

- e4b9778: fix(backend): show consent banner returning true in US etc

## 1.2.2-canary-20250514203718

### Patch Changes

- f24f11b: bump package
- Updated dependencies [f24f11b]
  - @c15t/translations@1.2.2-canary-20250514203718

## 1.2.2-canary-20250514183211

### Patch Changes

- f64f000: feat: added @c15t/nextjs, @c15t/translations for better integration, server-side translations & fetching of consent banner
- Updated dependencies [f64f000]
  - @c15t/translations@1.2.2-canary-20250514183211

## 1.2.1

### Patch Changes

- [#226](https://github.com/c15t/c15t/pull/226) [`aca32d3`](https://github.com/c15t/c15t/commit/aca32d3f0f76d75ad618a8ba3386ce385ac612e4) Thanks [@KayleeWilliams](https://github.com/KayleeWilliams)! - fix(backend): set consent validation error

## 1.2.0

### Minor Changes

- [#224](https://github.com/c15t/c15t/pull/224) [`838a9b5`](https://github.com/c15t/c15t/commit/838a9b52c31326899ec3c903e43bf7bc31a6490f) Thanks [@BurnedChris](https://github.com/BurnedChris)! - Refactored backend to be a new orpc client / server
