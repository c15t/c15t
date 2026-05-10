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
			clientId: 'db_123',
			apiUrl: 'https://basket.databuddy.cc',
			configWhenGranted: {
				clientId: 'db_123',
				apiUrl: 'https://basket.databuddy.cc',
				trackScreenViews: true,
				disabled: false,
			},
			configWhenDenied: {
				clientId: 'db_123',
				apiUrl: 'https://basket.databuddy.cc',
				trackScreenViews: true,
				disabled: true,
			},
		});

		expect(script.src).toBe('https://cdn.databuddy.cc/databuddy.js');
		expect(script.attributes).toEqual({
			crossorigin: 'anonymous',
			'data-client-id': 'db_123',
			'data-api-url': 'https://basket.databuddy.cc',
		});

		script.onBeforeLoad?.(
			createCallbackInfo({
				id: script.id,
				consents: deniedConsentState,
			})
		);

		expect(globalRef.databuddyConfig).toEqual({
			clientId: 'db_123',
			apiUrl: 'https://basket.databuddy.cc',
			trackScreenViews: true,
			disabled: true,
		});

		globalRef.databuddy = {
			track: vi.fn(),
			screenView: vi.fn(),
			clear: vi.fn(),
			flush: vi.fn(),
			setGlobalProperties: vi.fn(),
			trackCustomEvent: vi.fn(),
			options: {
				disabled: true,
			},
		};

		script.onLoad?.(
			createCallbackInfo({
				id: script.id,
				hasConsent: true,
				consents: grantedMeasurementConsentState,
			})
		);

		expect(
			(globalRef.databuddy as { options: { disabled: boolean } }).options
				.disabled
		).toBe(false);

		script.onConsentChange?.(
			createCallbackInfo({
				id: script.id,
				consents: deniedConsentState,
			})
		);

		expect(
			(globalRef.databuddy as { options: { disabled: boolean } }).options
				.disabled
		).toBe(true);
		expect(globalRef.databuddyConfig).toEqual({
			clientId: 'db_123',
			apiUrl: 'https://basket.databuddy.cc',
			trackScreenViews: true,
			disabled: true,
		});

		script.onConsentChange?.(
			createCallbackInfo({
				id: script.id,
				hasConsent: true,
				consents: grantedMeasurementConsentState,
			})
		);

		expect(globalRef.databuddyConfig).toEqual({
			clientId: 'db_123',
			apiUrl: 'https://basket.databuddy.cc',
			trackScreenViews: true,
			disabled: false,
		});
	});
});
