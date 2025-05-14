# c15t

## 1.2.2-canary-20250514183211

### Patch Changes

- f64f000: feat: added @c15t/nextjs, @c15t/translations for better integration, server-side translations & fetching of consent banner
- Updated dependencies [f64f000]
  - @c15t/translations@1.2.2-canary-20250514183211
  - @c15t/backend@1.2.2-canary-20250514183211

## 1.2.1

### Patch Changes

- Updated dependencies [[`aca32d3`](https://github.com/c15t/c15t/commit/aca32d3f0f76d75ad618a8ba3386ce385ac612e4)]:
  - @c15t/backend@1.2.1

## 1.2.0

### Minor Changes

- [#224](https://github.com/c15t/c15t/pull/224) [`838a9b5`](https://github.com/c15t/c15t/commit/838a9b52c31326899ec3c903e43bf7bc31a6490f) Thanks [@BurnedChris](https://github.com/BurnedChris)! - Refactored backend to be a new orpc client / server

### Patch Changes

- [#222](https://github.com/c15t/c15t/pull/222) [`b1de2ba`](https://github.com/c15t/c15t/commit/b1de2baccd63295d49fb2868f63659f5ff48a9ce) Thanks [@KayleeWilliams](https://github.com/KayleeWilliams)! - fix(core, react): added "common" translations, removed widget translations

- Updated dependencies [[`838a9b5`](https://github.com/c15t/c15t/commit/838a9b52c31326899ec3c903e43bf7bc31a6490f)]:
  - @c15t/backend@1.2.0

## 1.1.4

### Patch Changes

- [#207](https://github.com/c15t/c15t/pull/207) [`2d81c9f`](https://github.com/c15t/c15t/commit/2d81c9fc84ee960e46196dfd460407a925901a82) Thanks [@KayleeWilliams](https://github.com/KayleeWilliams)! - fix(core, react): translations not working

## 1.1.3

### Patch Changes

- [#203](https://github.com/c15t/c15t/pull/203) [`4d47e21`](https://github.com/c15t/c15t/commit/4d47e2109bfc894f1666b19f4ff40d7398f10c57) Thanks [@KayleeWilliams](https://github.com/KayleeWilliams)! - fix(core): callbacks not working on c15t mode

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

## 1.0.0-rc.1

### Patch Changes

- Refactored package.json imports

## 0.0.1-beta.10

### Patch Changes

- all build tools now use rslib + new formatting from biomejs

## 0.0.1-beta.9

### Patch Changes

- 1912aa9: Refactored codebase to use Ultracite Biome Config for stricter linting
