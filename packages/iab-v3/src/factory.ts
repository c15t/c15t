/**
 * IAB addon factory.
 *
 * The `iab()` function creates an IAB configuration with the runtime module
 * injected. This is the primary API — core never imports IAB code directly.
 *
 * @packageDocumentation
 */

import type { IABConfig, IABModule } from 'c15t';
import { initializeIABMode } from './init/iab-initializer';
import { createIABManager } from './tcf/store';

/**
 * User-facing IAB configuration.
 * Omits internal fields that are set by the factory.
 */
export type IABUserConfig = Omit<IABConfig, 'enabled' | '_module'>;

const iabModule: IABModule = {
	createIABManager,
	initializeIABMode,
};

/**
 * Creates an IAB TCF 2.3 configuration for the consent manager.
 *
 * @param config - IAB configuration (CMP ID, vendor list, etc.)
 * @returns IABConfig with the runtime module injected
 *
 * @example
 * ```tsx
 * import { iab } from '@c15t/iab';
 *
 * <ConsentManagerProvider options={{
 *   mode: 'hosted',
 *   iab: iab({ cmpId: 28, vendors: [1, 2, 755] }),
 * }}>
 * ```
 */
export function iab(config: IABUserConfig): IABConfig {
	return {
		...config,
		enabled: true,
		_module: iabModule,
	};
}
