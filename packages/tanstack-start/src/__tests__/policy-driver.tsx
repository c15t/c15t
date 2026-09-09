import { createFrameworkPolicyDriver } from '../../../react/src/__tests__/framework-policy-driver';
import { ConsentBoundary } from '../boundary';
import { readInitialConsentConfig } from '../server';

export const { createPolicySession, probePolicyContract } =
	createFrameworkPolicyDriver({
		Boundary: ConsentBoundary,
		readInitialConfig: ({ cookie, cookieName, now }) => {
			const request = new Request('https://example.com');
			// Browser Requests strip Cookie; server Requests retain it.
			Object.defineProperty(request, 'headers', {
				value: new Headers({ cookie }),
			});
			return readInitialConsentConfig({ cookieName, now, request });
		},
	});
