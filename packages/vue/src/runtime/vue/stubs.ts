/**
 * Vue `#imports` shim. Shared composables import `#imports`; Nuxt resolves to
 * real composables, plain Vue resolves here via the Vite plugin. Compatibility
 * is enforced by `check-types:nuxt` and `check-types:vue`, not a separate
 * typeof contract (Nuxt's `useFetch` overloads are not assignable to a narrow
 * stub signature).
 */
export * from '../composables/stubs/cookie';
export * from '../composables/stubs/fetch';
export * from '../composables/stubs/requestHeaders';
export * from '../composables/stubs/state';
