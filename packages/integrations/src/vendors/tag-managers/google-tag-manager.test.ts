import { describe, expect, it, vi } from 'vitest';

import {
	deniedConsentState,
	expectGoogleConsentDefault,
	getTestGlobal,
	grantedMeasurementConsentState,
	runOnBeforeLoad,
	toArgumentsArray,
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

	it.each(['customQueue', 'gtag', 'app.layer'])(
		'sends denied defaults to %s before loading the container',
		(dataLayer) => {
			const globalRef = getTestGlobal();
			vi.stubGlobal(dataLayer, undefined);
			vi.stubGlobal(`${dataLayer}Gtag`, undefined);
			const script = googleTagManager({
				dataLayer,
				id: 'GTM-CUSTOM',
			});
			runOnBeforeLoad(script, { consents: deniedConsentState });
			const queue = globalRef[dataLayer] as unknown[];
			expectGoogleConsentDefault(queue[0]);
			expect(queue[1]).toMatchObject({ event: 'gtm.js' });
			expect(script.src).toContain(`&l=${dataLayer}`);
			expect(script.attributes?.['data-c15t-layer']).toBe(dataLayer);
		}
	);

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

			const dataLayer = globalRef.dataLayer as Record<string, unknown>[];
			expect(dataLayer[1]?.['gtm.start']).toBe(1_777_777_777_777);
		} finally {
			nowSpy.mockRestore();
		}
	});

	it('loads before a choice in the necessary category by default', () => {
		const script = googleTagManager({ id: 'GTM-DEFAULT' });

		expect(script.alwaysLoad).toBe(true);
		expect(script.category).toBe('necessary');
		expect(script.persistAfterConsentRevoked).toBeUndefined();
		expect(script.src).toBe(
			'https://www.googletagmanager.com/gtm.js?id=GTM-DEFAULT'
		);
	});

	it('waits for measurement or marketing with loadMode after-consent', () => {
		const script = googleTagManager({
			id: 'GTM-GATED',
			loadMode: 'after-consent',
		});

		expect(script.alwaysLoad).toBeUndefined();
		expect(script.category).toEqual({ or: ['measurement', 'marketing'] });
		expect(script.persistAfterConsentRevoked).toBe(true);
		expect(script.src).toBe(
			'https://www.googletagmanager.com/gtm.js?id=GTM-GATED'
		);
	});

	it('uses the category option in either load mode', () => {
		expect(
			googleTagManager({
				category: 'measurement',
				id: 'GTM-GATED',
				loadMode: 'after-consent',
			}).category
		).toBe('measurement');
		expect(
			googleTagManager({ category: 'marketing', id: 'GTM-ALWAYS' })
		).toMatchObject({ alwaysLoad: true, category: 'marketing' });
	});

	it('sends the current permissions as the default before gtm.js when gated', () => {
		const globalRef = getTestGlobal();
		const script = googleTagManager({
			id: 'GTM-GATED',
			loadMode: 'after-consent',
		});

		runOnBeforeLoad(script, {
			consents: grantedMeasurementConsentState,
			hasConsent: true,
		});

		const dataLayer = globalRef.dataLayer as unknown[];
		expect(toArgumentsArray(dataLayer[0])).toEqual([
			'consent',
			'default',
			expect.objectContaining({
				ad_storage: 'denied',
				analytics_storage: 'granted',
			}),
		]);
		expect(dataLayer[1]).toMatchObject({ event: 'gtm.js' });
	});
});
