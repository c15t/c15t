import type { UIOptions } from '@c15t/ui/theme';

import type { ReactComponentSlots } from './slots';

/**
 * React-specific UI configuration options.
 *
 * @remarks
 * Extends the framework-agnostic {@link UIOptions} with per-component slot
 * overrides. `ConsentProvider` picks its theme-related options from here.
 *
 * @public
 */
export interface ReactUIOptions extends UIOptions {
	/** Per-component slot attribute overrides (shared contract with @c15t/vue). */
	components?: ReactComponentSlots;
}
