// #region docs:translations title="src/main.ts"
import { init, offline } from '@c15t/browser';
import { policyRulePresets } from 'c15t';

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
	mode: offline({ policyRules: [policyRulePresets.europeOptIn()] }),
	scripts,
});
// #endregion docs:translations
