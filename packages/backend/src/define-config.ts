import type { C15TOptions } from './types';

/**
 * c15t backend config accepted by `defineConfig`.
 *
 * Keep this as an intersection with `C15TOptions` (instead of `Omit`) so
 * TypeScript preserves property-level JSDoc in editor completions.
 */
export type C15TConfig = C15TOptions & {
	/**
	 * Logger config is managed internally and is not supported via config files.
	 */
	logger?: never;
};

/**
 * Helper for typed backend configuration in `c15t-backend.config.ts`.
 */
export const defineConfig = (config: C15TConfig) => config;
