import { os } from '~/contracts';

export const verifyConsent = os.consent.verify.handler(() => {
	return {
		isValid: false,
		reasons: ['Implementation pending'],
	};
});
