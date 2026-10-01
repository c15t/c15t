// Reference code for the callbacks page. No page in this example imports it;
// `bun run check-types` compiles it with the rest of the app.
// #region docs:callbacks title="src/main.ts"
import { init } from '@c15t/browser';

import { scripts } from './scripts';

export const consent = init({
	backendURL: 'https://your-project.inth.app',
	callbacks: {
		// Only a visitor's own accept, reject or save.
		onChoiceRecorded: ({ confirmed, snapshot }) => {
			console.info('Visitor confirmed', confirmed, snapshot.explicitChoice);
		},
		onError: ({ error }) => {
			console.warn('Consent request failed:', error);
		},
		// Any change to what may run, including a restored choice.
		onPermissionsChanged: ({ previous, snapshot }) => {
			console.info('Permissions', previous, snapshot.effectivePermissions);
		},
	},
	scripts,
});

// The surface c15t wants shown: 'banner', 'dialog' or 'none'.
consent.on('ui', (surface) => {
	document.documentElement.dataset.consentSurface = surface ?? 'none';
});
// #endregion docs:callbacks
