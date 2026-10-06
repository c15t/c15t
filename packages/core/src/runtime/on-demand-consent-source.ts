/**
 * A `consentSource` connection as an on-demand runtime module. Its own
 * file for the reason `on-demand-script-loader.ts` gives.
 */
import type { ConsentRuntimeModules } from './types';

/**
 * The `connectConsentSource` module, connected once its chunk lands.
 *
 * Optional categories stay denied until it connects, and stay denied if
 * the chunk fails to load. One of {@link onDemandRuntimeModules}; exported
 * on its own from `@c15t/core/runtime/on-demand-factories`.
 *
 * @param kernel - The kernel the source drives.
 * @param source - The external consent source.
 * @returns A disposer that disconnects, or cancels a pending connection.
 */
export const connectConsentSourceOnDemand: ConsentRuntimeModules['connectConsentSource'] =
	(kernel, source) => {
		let disconnect: (() => void) | undefined;
		let stopped = false;
		void (async () => {
			try {
				const controls = await import('./controls');
				if (!stopped) {
					disconnect = controls.connectConsentSource(kernel, source);
				}
			} catch {
				// Not connected: optional categories stay denied.
			}
		})();
		return () => {
			stopped = true;
			disconnect?.();
		};
	};
