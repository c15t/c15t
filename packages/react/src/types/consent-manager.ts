import type { BaseConsentManagerOptions, UIOptions } from '@c15t/ui/theme';
import type { ReactNode } from 'react';

/**
 * React-specific configuration options
 */
export interface ReactUIOptions extends UIOptions {}

/**
 * Extended configuration options for the React consent manager.
 *
 * @remarks
 * This type composes:
 * - Base framework-agnostic options from {@link BaseConsentManagerOptions}
 * - React-specific UI configuration
 */
export type ConsentManagerOptions = BaseConsentManagerOptions & ReactUIOptions;

/**
 * Configuration options for the ConsentManagerProvider.
 *
 * @public
 */
export interface ConsentManagerProviderProps {
	/**
	 * React children to render within the provider.
	 */
	children: ReactNode;

	/**
	 * Configuration options for the consent manager.
	 * This includes core, React, store, and translation settings.
	 */
	options: ConsentManagerOptions;
}
