import { os } from '~/contracts';

export const showConsentBanner = os.consent.showBanner.handler(() => {
	return {
		showConsentBanner: false,
		jurisdiction: {
			code: 'NONE',
			message: 'Implementation pending',
		},
		location: {
			countryCode: null,
			regionCode: null,
		},
	};
});
