/**
 * Vue `#imports` shim. Shared composables import `#imports`; Nuxt resolves to
 * real composables, plain Vue resolves here via the Vite plugin. Compatibility
 * is enforced by `check-types:nuxt` and `check-types:vue`, not a separate
 * typeof contract (Nuxt's `useFetch` overloads are not assignable to a narrow
 * stub signature).
 */

export * from '../composables';
export * from '../composables/stubs/cookie';
export * from '../composables/stubs/fetch';
export * from '../composables/stubs/requestHeaders';
export * from '../composables/stubs/state';

export function useHead(_input?: unknown): void {
	// Plain Vue does not have Nuxt head management; CSS variables are applied by
	// the Vue root component on mount.
}
