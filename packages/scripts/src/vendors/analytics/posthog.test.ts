import { describe, expect, it, vi } from 'vitest';
import {
	createCallbackInfo,
	deniedConsentState,
	getTestGlobal,
	grantedMeasurementConsentState,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { posthog } from './posthog';

describe('posthog', () => {
	setupScriptHelperTest();

	it('keeps init options as an object and syncs consent state', () => {
		const globalRef = getTestGlobal();
		const init = vi.fn();
		const optIn = vi.fn();
		const optOut = vi.fn();
		globalRef.posthog = {
			init: function initWithReceiver(
				token: string,
				options: Record<string, unknown>
			) {
				init(this, token, options);
			},
			opt_in_capturing: optIn,
			opt_out_capturing: optOut,
			get_explicit_consent_status: vi.fn(() => 'pending'),
			capture: vi.fn(),
		};

		const script = posthog({
			id: 'phc_123',
			apiHost: 'https://eu.i.posthog.com',
			scriptUrl: 'https://eu-assets.i.posthog.com/static/array.js',
			initOptions: {
				api_host: 'https://eu.i.posthog.com',
				ui_host: 'https://eu.i.posthog.com',
				autocapture: false,
				person_profiles: 'identified_only',
				cookieless_mode: 'on_reject',
			},
		});

		expect(script.src).toBe('https://eu-assets.i.posthog.com/static/array.js');
		expect(script.attributes).toEqual({
			crossorigin: 'anonymous',
			'data-api-host': 'https://eu.i.posthog.com',
			'data-ui-host': 'https://eu.i.posthog.com',
		});

		script.onLoad?.(
			createCallbackInfo({
				id: script.id,
				consents: deniedConsentState,
			})
		);

		expect(init).toHaveBeenCalledWith(globalRef.posthog, 'phc_123', {
			api_host: 'https://eu.i.posthog.com',
			ui_host: 'https://eu.i.posthog.com',
			autocapture: false,
			person_profiles: 'identified_only',
			cookieless_mode: 'on_reject',
			defaults: '2026-01-30',
		});
		expect(optOut).toHaveBeenCalledTimes(1);

		script.onConsentChange?.(
			createCallbackInfo({
				id: script.id,
				hasConsent: true,
				consents: grantedMeasurementConsentState,
			})
		);

		expect(optIn).toHaveBeenCalledTimes(1);
	});

	it('uses consent-aware defaults when optional options are omitted', () => {
		const globalRef = getTestGlobal();
		const init = vi.fn();
		globalRef.posthog = {
			init,
			opt_in_capturing: vi.fn(),
			opt_out_capturing: vi.fn(),
			get_explicit_consent_status: vi.fn(() => 'pending'),
			capture: vi.fn(),
		};

		const script = posthog({
			id: 'phc_defaults',
		});

		expect(script.src).toBe('https://eu-assets.i.posthog.com/static/array.js');
		expect(script.attributes).toEqual({
			crossorigin: 'anonymous',
			'data-api-host': 'https://eu.i.posthog.com',
			'data-ui-host': 'https://eu.i.posthog.com',
		});

		script.onLoad?.(
			createCallbackInfo({
				id: script.id,
				consents: grantedMeasurementConsentState,
			})
		);

		expect(init).toHaveBeenCalledWith('phc_defaults', {
			api_host: 'https://eu.i.posthog.com',
			defaults: '2026-01-30',
			cookieless_mode: 'on_reject',
		});
	});

	it('allows explicit init options to override helper defaults', () => {
		const globalRef = getTestGlobal();
		const init = vi.fn();
		globalRef.posthog = {
			init,
			opt_in_capturing: vi.fn(),
			opt_out_capturing: vi.fn(),
			get_explicit_consent_status: vi.fn(() => 'pending'),
			capture: vi.fn(),
		};

		const script = posthog({
			id: 'phc_overrides',
			apiHost: 'https://eu.i.posthog.com',
			initOptions: {
				api_host: 'https://us.i.posthog.com',
				defaults: '2025-05-24',
				cookieless_mode: 'always',
			},
		});

		script.onLoad?.(
			createCallbackInfo({
				id: script.id,
				consents: deniedConsentState,
			})
		);

		expect(init).toHaveBeenCalledWith('phc_overrides', {
			api_host: 'https://us.i.posthog.com',
			defaults: '2025-05-24',
			cookieless_mode: 'always',
		});
	});
});
