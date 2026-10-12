/**
 * Stand-in for `@c15t/core/generated` in tests (aliased in
 * `vitest.config.ts`): what a `consentManifest()` build would serve. Both
 * exports are live bindings that {@link setGenerated} changes.
 */
import type { ConsentManifest } from '@c15t/schema/types';

// oxlint-disable-next-line import/no-mutable-exports -- Live bindings stand in for a build's values.
export let backendURL: string | undefined;
// oxlint-disable-next-line import/no-mutable-exports -- See above.
export let snapshot: ConsentManifest | undefined;

/** Sets what the build appears to have fetched. */
export const setGenerated = (module: {
	backendURL?: string;
	snapshot?: ConsentManifest;
}): void => {
	({ backendURL, snapshot } = module);
};
