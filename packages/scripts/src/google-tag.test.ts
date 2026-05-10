import { describe, expect, it } from 'vitest';
import {
	deniedConsentState,
	expectScriptMatchesIntegration,
	getTestGlobal,
	setupScriptHelperTest,
	toArgumentsArray,
} from './__tests__/helpers';
import { gtag } from './google-tag';

describe('gtag', () => {
	setupScriptHelperTest();

	it('matches registry metadata and default script output', () => {
		expectScriptMatchesIntegration(
			'gtag',
			gtag({ id: 'G-123', category: 'measurement' }),
			{
				alwaysLoad: true,
				persistAfterConsentRevoked: true,
				src: 'https://www.googletagmanager.com/gtag/js?id=G-123',
			}
		);
	});

	it('runs consent defaults before config calls', () => {
		const globalRef = getTestGlobal();
		const script = gtag({ id: 'G-ORDER', category: 'measurement' });
		globalRef.dataLayer = [];

		script.onBeforeLoad?.({
			id: script.id,
			elementId: script.id,
			hasConsent: false,
			consents: deniedConsentState,
		});

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
		expect(toArgumentsArray(dataLayer[1])[0]).toBe('js');
		expect(toArgumentsArray(dataLayer[2])).toEqual(['config', 'G-ORDER']);
		expect(document.head.appendChild).not.toHaveBeenCalled();
	});

	it('preserves deprecated script overrides', () => {
		const script = gtag({
			id: 'G-OVERRIDE',
			category: 'measurement',
			script: {
				nonce: 'abc123',
				target: 'body',
				attributes: {
					'data-test': '1',
				},
			},
		});

		expect(script.nonce).toBe('abc123');
		expect(script.target).toBe('body');
		expect(script.attributes).toEqual({
			'data-test': '1',
		});
	});
});
