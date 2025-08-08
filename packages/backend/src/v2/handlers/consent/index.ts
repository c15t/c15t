import { postConsent } from './post.handler';
import { showConsentBanner } from './show-banner/handler';
import { verifyConsent } from './verify.handler';

export const consentHandlers = {
	post: postConsent,
	showBanner: showConsentBanner,
	verify: verifyConsent,
};
