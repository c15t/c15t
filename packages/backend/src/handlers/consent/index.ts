import { identifyUser } from './identify.handler';
import { postConsent } from './post.handler';
import { verifyConsent } from './verify.handler';

export const consentHandlers = {
	post: postConsent,
	verify: verifyConsent,
	identify: identifyUser,
};
