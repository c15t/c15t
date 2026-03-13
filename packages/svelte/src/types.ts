import type { BaseConsentManagerOptions, UIOptions } from '@c15t/ui/theme';

/**
 * Svelte-specific configuration options.
 */
export interface SvelteUIOptions extends UIOptions {}

/**
 * Extended configuration options for the Svelte consent manager.
 *
 * @remarks
 * Composes base framework-agnostic options with Svelte-specific UI configuration.
 */
export type ConsentManagerOptions = BaseConsentManagerOptions & SvelteUIOptions;
