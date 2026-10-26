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

	it('waits for measurement consent by default', () => {
		const script = databuddy({ clientId: 'db_123' });

		expect(script.alwaysLoad).toBeUndefined();
		expect(script.category).toBe('measurement');
		expect(script.src).toBe('https://cdn.databuddy.cc/databuddy.js');
	});

	it('seeds the client ID, API URL and disabled flag when no configs are passed', () => {
		const globalRef = getTestGlobal();
		const script = databuddy({ clientId: 'db_123', loadMode: 'always' });

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
		});
	});

	it('sets the config disabled key from consent when always loaded', () => {
		const globalRef = getTestGlobal();
		const script = databuddy({
			clientId: 'db_123',
			configWhenDenied: { clientId: 'db_123' },
			configWhenGranted: { clientId: 'db_123', disabled: true },
			loadMode: 'always',
		});

		script.onBeforeLoad?.(
			createCallbackInfo({
				consents: deniedConsentState,
				id: script.id,
			})
		);
		// databuddy.js reads this as it starts, before onLoad disables it.
		expect(globalRef.databuddyConfig).toEqual({
			clientId: 'db_123',
			disabled: true,
		});

		script.onConsentChange?.(
			createCallbackInfo({
				consents: grantedMeasurementConsentState,
				hasConsent: true,
				id: script.id,
			})
		);
		expect(globalRef.databuddyConfig).toEqual({
			clientId: 'db_123',
			disabled: false,
		});
	});

	it('sets a data attribute for each feature switch', () => {
		const script = databuddy({
			clientId: 'db_123',
			features: {
				errors: true,
				interactions: false,
				outgoingLinks: true,
				webVitals: false,
			},
		});

		expect(script.attributes).toEqual({
			crossorigin: 'anonymous',
			'data-api-url': 'https://basket.databuddy.cc',
			'data-client-id': 'db_123',
			'data-track-errors': 'true',
			'data-track-interactions': 'false',
			'data-track-outgoing-links': 'true',
			'data-track-web-vitals': 'false',
		});
	});

	it('preserves config seeding and sync behavior when always loaded', () => {
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
			loadMode: 'always',
		});

		expect(script.alwaysLoad).toBe(true);
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

	it('disposes replay during server rendering', () => {
		const script = databuddy({ clientId: 'db_123', replay: true });
		vi.stubGlobal('window', undefined);

		expect(script.onDispose).toBeTypeOf('function');
		expect(() =>
			script.onDispose?.(createCallbackInfo({ id: script.id }))
		).not.toThrow();
	});
});
