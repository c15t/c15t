import { describe, expect, it, vi } from 'vitest';
import {
	deniedConsentState,
	expectScriptMatchesIntegration,
	getTestGlobal,
	grantedMeasurementConsentState,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { posthog } from './posthog';

describe('posthog', () => {
	setupScriptHelperTest();

	it('matches registry metadata and default script output', () => {
		expectScriptMatchesIntegration('posthog', posthog({ id: 'phc_123' }), {
			alwaysLoad: true,
			persistAfterConsentRevoked: undefined,
			src: 'https://eu-assets.i.posthog.com/static/array.js',
		});
	});

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

		script.onLoad?.({
			id: script.id,
			elementId: script.id,
			hasConsent: false,
			consents: deniedConsentState,
		});

		expect(init).toHaveBeenCalledWith(globalRef.posthog, 'phc_123', {
			api_host: 'https://eu.i.posthog.com',
			ui_host: 'https://eu.i.posthog.com',
			autocapture: false,
			person_profiles: 'identified_only',
			cookieless_mode: 'on_reject',
		});
		expect(optOut).toHaveBeenCalledTimes(1);

		script.onConsentChange?.({
			id: script.id,
			elementId: script.id,
			hasConsent: true,
			consents: grantedMeasurementConsentState,
		});

		expect(optIn).toHaveBeenCalledTimes(1);
	});

	it('uses defaults when optional options are omitted', () => {
		const script = posthog({
			id: 'phc_defaults',
		});

		expect(script.src).toBe('https://eu-assets.i.posthog.com/static/array.js');
		expect(script.attributes).toEqual({
			crossorigin: 'anonymous',
			'data-api-host': 'https://eu.i.posthog.com',
			'data-ui-host': 'https://eu.i.posthog.com',
		});
	});
});
