/**
 * Typed configuration for `c15t-backend.config.ts`.
 *
 * An identity function. Its whole job is to give the object a type, so an
 * editor completes it and a typo is a compile error rather than a runtime
 * surprise in production.
 */

import type { C15TOptions } from './instance';

/**
 * Backend configuration accepted by {@link defineConfig}.
 *
 * An intersection with `C15TOptions` rather than an `Omit`, so TypeScript
 * keeps the property-level documentation in editor completions — an `Omit`
 * flattens it away, which is the whole point of the helper.
 */
export type C15TConfig = C15TOptions & {
	/**
	 * Not configurable from a config file.
	 *
	 * Observability needs a drain function, and a config file that has to
	 * export executable callbacks stops being configuration. Pass
	 * `observability` to `c15tInstance` directly instead.
	 */
	observability?: never;
};

/**
 * @example
 * ```ts
 * // c15t-backend.config.ts
 * import { defineConfig } from '@c15t/backend';
 *
 * export default defineConfig({
 * 	database: { dialect: 'postgres', url: process.env.DATABASE_URL },
 * 	trustedOrigins: ['https://app.example.com'],
 * });
 * ```
 */
export const defineConfig = (config: C15TConfig): C15TConfig => config;
