import { describe, expect, it } from 'vitest';
import {
	deniedConsentState,
	expectGoogleConsentDefault,
	getTestGlobal,
	runOnBeforeLoad,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { googleTagManager } from './google-tag-manager';

describe('googleTagManager', () => {
	setupScriptHelperTest();

	it('runs consent defaults before boot logic', () => {
		const globalRef = getTestGlobal();
		const script = googleTagManager({ id: 'GTM-ORDER' });
		globalRef.dataLayer = [];

		runOnBeforeLoad(script, {
			consents: deniedConsentState,
		});

		const dataLayer = globalRef.dataLayer as unknown[];
		expectGoogleConsentDefault(dataLayer[0]);
		expect(dataLayer[1]).toMatchObject({ event: 'gtm.js' });
		expect(document.head.appendChild).not.toHaveBeenCalled();
	});
});
