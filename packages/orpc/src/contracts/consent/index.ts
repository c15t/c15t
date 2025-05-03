import { postConsentContract } from './post.contract';
import { showConsentBannerContract } from './show-banner.contract';
import { verifyConsentContract } from './verify.contract';

export const consentContracts = {
	post: postConsentContract,
	showBanner: showConsentBannerContract,
	verify: verifyConsentContract,
};
