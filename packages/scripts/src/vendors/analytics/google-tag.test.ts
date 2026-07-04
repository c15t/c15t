import { describe, expect, it } from 'vitest';
import {
	deniedConsentState,
	expectGoogleConsentDefault,
	getTestGlobal,
	runOnBeforeLoad,
	setupScriptHelperTest,
	toArgumentsArray,
} from '../../__tests__/helpers';
import { gtag } from './google-tag';

describe('gtag', () => {
	setupScriptHelperTest();

	it('runs consent defaults before config calls', () => {
		const globalRef = getTestGlobal();
		const script = gtag({ id: 'G-ORDER', category: 'measurement' });
		globalRef.dataLayer = [];

		runOnBeforeLoad(script, {
			consents: deniedConsentState,
		});

		const dataLayer = globalRef.dataLayer as unknown[];
		expectGoogleConsentDefault(dataLayer[0]);
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
