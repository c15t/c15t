/** Shared controls for adapters that own their kernel lifecycle. */
import type { InternalKernel } from '../kernel/internals';
import type { ConsentKernel, ConsentState, Unsubscribe } from '../types';
import type { ConsentRuntimeOptions, ExternalConsentSource } from './types';

/** Options shared by every framework provider. Configure these before mounting. */
export type ConsentControlOptions = Pick<
	ConsentRuntimeOptions,
	'consentSource'
>;

/**
 * Delegate preference requests and synchronize the external authority.
 * @param kernel - A kernel created with `initialExternalPermissions`.
 * @param source - The existing CMP's client-side decision source.
 * @returns Cleanup for the source and preference listener. Call once per owner.
 */
export const connectConsentSource = (
	kernel: ConsentKernel,
	source: ExternalConsentSource
): Unsubscribe => {
	let disposed = false;
	const report = (error: unknown) => {
		if (!disposed) {
			(kernel as InternalKernel).events.emit({
				command: 'preferences',
				error,
				type: 'command:error',
			});
		}
	};
	const unsubscribePreferences = kernel.events.on(
		'preferences:requested',
		() => {
			void (async () => {
				try {
					await source.openPreferences();
				} catch (error) {
					report(error);
				}
			})();
		}
	);
	const sync = () => {
		if (disposed) {
			return;
		}
		let permissions: Partial<ConsentState> | null = null;
		try {
			permissions = source.getPermissions();
		} catch {
			/* Fail closed. */
		}
		kernel.set.externalPermissions(permissions ?? {});
	};
	let unsubscribe: Unsubscribe;
	try {
		unsubscribe = source.subscribe(sync);
	} catch (error) {
		kernel.set.externalPermissions({});
		report(error);
		disposed = true;
		unsubscribePreferences();
		return () => {
			// The failed connection is already disposed.
		};
	}
	sync();
	return () => {
		disposed = true;
		unsubscribe();
		unsubscribePreferences();
	};
};
