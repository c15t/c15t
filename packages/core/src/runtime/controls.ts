/** Shared controls for adapters that own their kernel lifecycle. */
import type { ConsentKernel, ConsentState, Unsubscribe } from '../types';
import type { ConsentRuntimeOptions, ExternalConsentSource } from './types';

/** Options shared by every framework provider. Configure these before mounting. */
export type ConsentControlOptions = Pick<
	ConsentRuntimeOptions,
	'consentSource' | 'reloadOnRevocation'
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
			kernel.events.emit({
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
		let permissions = null;
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
		disposed = true;
		kernel.set.externalPermissions({});
		unsubscribePreferences();
		throw error;
	}
	sync();
	return () => {
		disposed = true;
		unsubscribe();
		unsubscribePreferences();
	};
};

/**
 * Reload once after synchronous withdrawal callbacks, unless unmounted first.
 * @param kernel - The mounted browser kernel whose permissions control scripts.
 * @returns Cleanup that also cancels a pending reload.
 */
export const reloadOnConsentRevocation = (
	kernel: ConsentKernel
): Unsubscribe => {
	let previous = kernel.getSnapshot().effectivePermissions;
	let scheduled = false;
	let disposed = false;
	const unsubscribe = kernel.subscribe((snapshot) => {
		const next = snapshot.effectivePermissions;
		const revoked = Object.keys(previous).some(
			(category) =>
				category !== 'necessary' &&
				previous[category as keyof ConsentState] &&
				!next[category as keyof ConsentState]
		);
		previous = next;
		if (revoked && !scheduled) {
			scheduled = true;
			queueMicrotask(() => {
				if (!disposed) {
					window.location.reload();
				}
			});
		}
	});
	return () => {
		disposed = true;
		unsubscribe();
	};
};
