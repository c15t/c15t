import { describe, expect, it, vi } from 'vitest';
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

	it('resolves gtm.start when the script lifecycle runs', () => {
		const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_777_777_777_777);
		try {
			const globalRef = getTestGlobal();
			const script = googleTagManager({ id: 'GTM-RUNTIME' });

			expect(nowSpy).not.toHaveBeenCalled();

			globalRef.dataLayer = [];
			runOnBeforeLoad(script, {
				consents: deniedConsentState,
			});

			const dataLayer = globalRef.dataLayer as Array<Record<string, unknown>>;
			expect(dataLayer[1]?.['gtm.start']).toBe(1_777_777_777_777);
		} finally {
			nowSpy.mockRestore();
		}
	});
});
