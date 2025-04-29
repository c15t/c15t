# c15t

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
