# @c15t/cli

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
