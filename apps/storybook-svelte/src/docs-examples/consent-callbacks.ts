// #region docs:consent-callbacks title="src/lib/consent-callbacks.ts"
import type { ConsentProviderCallbacks } from '@c15t/svelte';

// Pass as `callbacks={callbacks}` on ConsentManagerProvider.
export const callbacks: ConsentProviderCallbacks = {
	// Runs just before c15t reloads the page after a withdrawal.
	onBeforeConsentRevocationReload: ({ preferences }) => {
		console.info('Reloading with', preferences);
	},
	// An explicit accept, reject or save. Never runs for defaults, expiry,
	// policy changes or privacy signals.
	onChoiceRecorded: ({ snapshot, confirmed }) => {
		console.info('Visitor chose', snapshot.explicitChoice, confirmed);
	},
	// A failed command, such as an /init request that could not reach the
	// backend.
	onError: ({ error }) => {
		console.warn('c15t error', error);
	},
	// Any change to what may run, whatever caused it.
	onPermissionsChanged: ({ snapshot, previous }) => {
		console.info('Permissions', previous, '->', snapshot.effectivePermissions);
	},
};
// #endregion docs:consent-callbacks
