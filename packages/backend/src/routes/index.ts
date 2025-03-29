import { setConsent } from './set-consent';
import { showConsentBanner } from './show-consent-banner';
import { status } from './status';
import { verifyConsent } from './verify-consent';
export * from './error';
export * from './ok';

export const baseEndpoints = {
	setConsent,
	showConsentBanner,
	status,
	verifyConsent,
};

// export response and bodytypes
export type { SetConsentResponse, SetConsentRequest } from './set-consent';
export type { ShowConsentBannerResponse } from './show-consent-banner';
export type {
	VerifyConsentResponse,
	VerifyConsentRequest,
} from './verify-consent';
