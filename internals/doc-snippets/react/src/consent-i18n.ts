// #region docs:i18n
import type { ConsentProviderOptions } from 'c15t/react';

// Keys you leave out keep the copy from your Inth project.
export const i18n = {
	messages: {
		de: {
			common: { rejectAll: 'Optionale ablehnen' },
			cookieBanner: { title: 'Cookies auf dieser Website' },
		},
		en: {
			common: { rejectAll: 'Reject optional' },
			cookieBanner: { title: 'Cookies on this site' },
		},
	},
} satisfies ConsentProviderOptions['i18n'];
// #endregion docs:i18n
