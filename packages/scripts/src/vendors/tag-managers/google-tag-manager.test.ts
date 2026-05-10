import { describe, expect, it } from 'vitest';
import {
	createCallbackInfo,
	deniedConsentState,
	getTestGlobal,
	setupScriptHelperTest,
	toArgumentsArray,
} from '../../__tests__/helpers';
import { googleTagManager } from './google-tag-manager';

describe('googleTagManager', () => {
	setupScriptHelperTest();

	it('runs consent defaults before boot logic', () => {
		const globalRef = getTestGlobal();
		const script = googleTagManager({ id: 'GTM-ORDER' });
		globalRef.dataLayer = [];

		script.onBeforeLoad?.(
			createCallbackInfo({
				id: script.id,
				consents: deniedConsentState,
			})
		);

		const dataLayer = globalRef.dataLayer as unknown[];
		expect(toArgumentsArray(dataLayer[0])).toEqual([
			'consent',
			'default',
			{
				security_storage: 'granted',
				functionality_storage: 'denied',
				analytics_storage: 'denied',
				ad_storage: 'denied',
				ad_user_data: 'denied',
				ad_personalization: 'denied',
				personalization_storage: 'denied',
			},
		]);
		expect(dataLayer[1]).toMatchObject({ event: 'gtm.js' });
		expect(document.head.appendChild).not.toHaveBeenCalled();
	});
});
