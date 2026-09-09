import { createFrameworkPolicyDriver } from '../../../react/src/__tests__/framework-policy-driver';
import { ConsentBoundary } from '../boundary';
import { readInitialConsentConfig } from '../server';

export const { createPolicySession, probePolicyContract } =
	createFrameworkPolicyDriver({
		Boundary: ConsentBoundary,
		readInitialConfig: ({ cookie, cookieName, now }) =>
			readInitialConsentConfig({
				cookieName,
				now,
				request: {
					cookies: () => ({ toString: () => cookie }),
					headers: () => new Headers({ cookie }),
				},
			}),
	});
