import { createFrameworkPolicyDriver } from '../../../react/src/__tests__/framework-policy-driver';
import { ConsentRoot } from '../root';
import { resolveConsent } from '../server';

export const { createPolicySession, probePolicyContract } =
	createFrameworkPolicyDriver({
		Root: ConsentRoot,
		readInitialConfig: ({ cookie, cookieName, now }) => {
			const request = new Request('https://example.com');
			// Browser Requests strip Cookie; server Requests retain it.
			Object.defineProperty(request, 'headers', {
				value: new Headers({ cookie }),
			});
			return resolveConsent({ cookieName, now, request });
		},
	});
