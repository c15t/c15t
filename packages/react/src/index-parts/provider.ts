/**
 * One group of `@c15t/react`'s public exports. The package index re-exports
 * each group with `export *`, so a bundler that splits code by reachability
 * (esbuild) does not treat every module the index names as part of an app
 * that imports one hook: only the groups it uses are live.
 */
export { ConsentProvider } from '../provider';
