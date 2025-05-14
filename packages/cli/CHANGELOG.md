# @c15t/cli

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
