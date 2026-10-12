// #region docs:consent-i18n title="src/lib/consent-i18n.ts"
import type { I18nConfig } from '@c15t/svelte';

// Pass as `i18n={i18n}` on ConsentProvider. Messages merge over the
// bundled English copy, so list only the keys you change.
export const i18n: Partial<I18nConfig> = {
	locale: 'en',
	messages: {
		en: {
			common: {
				customize: 'Choose cookies',
				rejectAll: 'Reject optional',
			},
			cookieBanner: {
				title: 'Your privacy on this site',
			},
		},
	},
};
// #endregion docs:consent-i18n
