// Reference code for the translations page. No page in this example imports
// it; `bun run check-types` compiles it with the rest of the app.
// #region docs:translations title="src/main.ts"
import { init } from '@c15t/browser';

import { scripts } from './scripts';

// Offline mode shows the copy in `i18n`. With a backend, the backend's copy
// for the visitor's language replaces these messages.
export const consent = init({
	i18n: {
		locale: 'de',
		messages: {
			de: {
				common: {
					acceptAll: 'Alle akzeptieren',
					acknowledge: 'OK',
					customize: 'Anpassen',
					rejectAll: 'Alle ablehnen',
					save: 'Einstellungen speichern',
				},
				cookieBanner: {
					description:
						'Wir verwenden Cookies, um die Nutzung dieser Website zu messen.',
					title: 'Wir respektieren Ihre Privatsphäre',
				},
			},
		},
	},
	policyRules: ['europeOptIn'],
	scripts,
});
// #endregion docs:translations
