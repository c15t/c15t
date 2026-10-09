/**
 * Stand-in for SvelteKit's `$app/env` in tests (aliased in
 * `vitest.config.ts`). `building` is a live binding, so a test can flip it
 * with {@link setBuilding} to render as SvelteKit does while prerendering.
 */
// oxlint-disable-next-line import/no-mutable-exports -- A live binding, as SvelteKit's own is per build.
export let building = false;

/** Sets what `building` reads until the next call. */
export const setBuilding = (value: boolean): void => {
	building = value;
};
