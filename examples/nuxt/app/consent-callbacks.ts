// Not registered in this example. The docs publish it, and `nuxt typecheck`
// verifies it against the module's option types.
// #region docs:callbacks title="app/consent-callbacks.ts"
import type { C15tNuxtConfig } from 'c15t/vue';

export const callbacks = {
	// The visitor clicked Accept all, Reject all or Save.
	onChoiceRecorded: ({ snapshot }) => {
		console.info('Choice recorded', snapshot.explicitChoice);
	},
	onError: ({ error }) => {
		console.error('c15t', error);
	},
	// Permissions changed for any reason: a choice, an expired choice, a new
	// policy or a privacy signal.
	onPermissionsChanged: ({ previous, snapshot }) => {
		console.info('Permissions', previous, snapshot.effectivePermissions);
	},
} satisfies NonNullable<C15tNuxtConfig['callbacks']>;
// #endregion docs:callbacks
