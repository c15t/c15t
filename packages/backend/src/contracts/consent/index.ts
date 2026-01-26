import { identifyUserContract } from './identify.contract';
import { postConsentContract } from './post.contract';
import { verifyConsentContract } from './verify.contract';

export const consentContracts = {
	post: postConsentContract,
	verify: verifyConsentContract,
	identify: identifyUserContract,
};
