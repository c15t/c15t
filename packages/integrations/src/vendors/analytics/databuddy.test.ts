import { describe, expect, it, vi } from 'vitest';

import {
	createCallbackInfo,
	deniedConsentState,
	getTestGlobal,
	grantedMeasurementConsentState,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { databuddy } from './databuddy';

describe('databuddy', () => {
	setupScriptHelperTest();

	it('preserves config seeding and sync behavior', () => {
		const globalRef = getTestGlobal();
		const script = databuddy({
			apiUrl: 'https://basket.databuddy.cc',
			clientId: 'db_123',
			configWhenDenied: {
				apiUrl: 'https://basket.databuddy.cc',
				clientId: 'db_123',
				disabled: true,
				trackScreenViews: true,
			},
			configWhenGranted: {
				apiUrl: 'https://basket.databuddy.cc',
				clientId: 'db_123',
				disabled: false,
				trackScreenViews: true,
			},
		});

		expect(script.src).toBe('https://cdn.databuddy.cc/databuddy.js');
		expect(script.attributes).toEqual({
			crossorigin: 'anonymous',
			'data-api-url': 'https://basket.databuddy.cc',
			'data-client-id': 'db_123',
		});

		script.onBeforeLoad?.(
			createCallbackInfo({
				consents: deniedConsentState,
				id: script.id,
			})
		);

		expect(globalRef.databuddyConfig).toEqual({
			apiUrl: 'https://basket.databuddy.cc',
			clientId: 'db_123',
			disabled: true,
			trackScreenViews: true,
		});

		globalRef.databuddy = {
			clear: vi.fn(),
			flush: vi.fn(),
			options: {
				disabled: true,
			},
			screenView: vi.fn(),
			setGlobalProperties: vi.fn(),
			track: vi.fn(),
			trackCustomEvent: vi.fn(),
		};

		script.onLoad?.(
			createCallbackInfo({
				consents: grantedMeasurementConsentState,
				hasConsent: true,
				id: script.id,
			})
		);

		expect(
			(globalRef.databuddy as { options: { disabled: boolean } }).options
				.disabled
		).toBe(false);

		script.onConsentChange?.(
			createCallbackInfo({
				consents: deniedConsentState,
				id: script.id,
			})
		);

		expect(
			(globalRef.databuddy as { options: { disabled: boolean } }).options
				.disabled
		).toBe(true);
		expect(globalRef.databuddyConfig).toEqual({
			apiUrl: 'https://basket.databuddy.cc',
			clientId: 'db_123',
			disabled: true,
			trackScreenViews: true,
		});

		script.onConsentChange?.(
			createCallbackInfo({
				consents: grantedMeasurementConsentState,
				hasConsent: true,
				id: script.id,
			})
		);

		expect(globalRef.databuddyConfig).toEqual({
			apiUrl: 'https://basket.databuddy.cc',
			clientId: 'db_123',
			disabled: false,
			trackScreenViews: true,
		});
		expect(
			(globalRef.databuddy as { options: { disabled: boolean } }).options
				.disabled
		).toEqual(false);
	});
});
