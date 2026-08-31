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
			capture: vi.fn(),
			get_explicit_consent_status: vi.fn(() => 'pending'),
			// oxlint-disable-next-line func-name-matching -- Preserve declaration order, interface shape, and public compatibility.
			init: function initWithReceiver(
				token: string,
				options: Record<string, unknown>
			) {
				init(this, token, options);
			},
			opt_in_capturing: optIn,
			opt_out_capturing: optOut,
		};

		const script = posthog({
			apiHost: 'https://eu.i.posthog.com',
			id: 'phc_123',
			initOptions: {
				api_host: 'https://eu.i.posthog.com',
				autocapture: false,
				cookieless_mode: 'on_reject',
				person_profiles: 'identified_only',
				ui_host: 'https://eu.i.posthog.com',
			},
			scriptUrl: 'https://eu-assets.i.posthog.com/static/array.js',
		});

		expect(script.src).toBe('https://eu-assets.i.posthog.com/static/array.js');
		expect(script.attributes).toEqual({
			crossorigin: 'anonymous',
			'data-api-host': 'https://eu.i.posthog.com',
			'data-ui-host': 'https://eu.posthog.com',
		});

		script.onLoad?.(
			createCallbackInfo({
				consents: deniedConsentState,
				id: script.id,
			})
		);

		expect(init).toHaveBeenCalledWith(globalRef.posthog, 'phc_123', {
			api_host: 'https://eu.i.posthog.com',
			autocapture: false,
			cookieless_mode: 'on_reject',
			defaults: '2026-01-30',
			person_profiles: 'identified_only',
			ui_host: 'https://eu.posthog.com',
		});
		expect(optOut).toHaveBeenCalledTimes(1);

		script.onConsentChange?.(
			createCallbackInfo({
				consents: grantedMeasurementConsentState,
				hasConsent: true,
				id: script.id,
			})
		);

		expect(optIn).toHaveBeenCalledTimes(1);
	});

	it('uses consent-aware defaults when optional options are omitted', () => {
		const globalRef = getTestGlobal();
		const init = vi.fn();
		globalRef.posthog = {
			capture: vi.fn(),
			get_explicit_consent_status: vi.fn(() => 'pending'),
			init,
			opt_in_capturing: vi.fn(),
			opt_out_capturing: vi.fn(),
		};

		const script = posthog({
			id: 'phc_defaults',
		});

		expect(script.src).toBe('https://eu-assets.i.posthog.com/static/array.js');
		expect(script.attributes).toEqual({
			crossorigin: 'anonymous',
			'data-api-host': 'https://eu.i.posthog.com',
			'data-ui-host': 'https://eu.posthog.com',
		});

		script.onLoad?.(
			createCallbackInfo({
				consents: grantedMeasurementConsentState,
				id: script.id,
			})
		);

		expect(init).toHaveBeenCalledWith('phc_defaults', {
			api_host: 'https://eu.i.posthog.com',
			cookieless_mode: 'on_reject',
			defaults: '2026-01-30',
			ui_host: 'https://eu.posthog.com',
		});
	});

	it('derives US hosts from the region option', () => {
		const globalRef = getTestGlobal();
		const init = vi.fn();
		globalRef.posthog = {
			capture: vi.fn(),
			get_explicit_consent_status: vi.fn(() => 'pending'),
			init,
			opt_in_capturing: vi.fn(),
			opt_out_capturing: vi.fn(),
		};

		const script = posthog({
			id: 'phc_us',
			region: 'us',
		});

		expect(script.src).toBe('https://us-assets.i.posthog.com/static/array.js');
		expect(script.attributes).toEqual({
			crossorigin: 'anonymous',
			'data-api-host': 'https://us.i.posthog.com',
			'data-ui-host': 'https://us.posthog.com',
		});

		script.onLoad?.(
			createCallbackInfo({
				consents: grantedMeasurementConsentState,
				id: script.id,
			})
		);

		expect(init).toHaveBeenCalledWith('phc_us', {
			api_host: 'https://us.i.posthog.com',
			cookieless_mode: 'on_reject',
			defaults: '2026-01-30',
			ui_host: 'https://us.posthog.com',
		});
	});

	it('derives the bootstrap script URL from an explicit API host', () => {
		const script = posthog({
			apiHost: 'https://us.i.posthog.com',
			id: 'phc_us_host',
		});

		expect(script.src).toBe('https://us-assets.i.posthog.com/static/array.js');
		expect(script.attributes).toEqual({
			crossorigin: 'anonymous',
			'data-api-host': 'https://us.i.posthog.com',
			'data-ui-host': 'https://us.posthog.com',
		});
	});

	it('allows explicit host and script URL overrides', () => {
		const globalRef = getTestGlobal();
		const init = vi.fn();
		globalRef.posthog = {
			capture: vi.fn(),
			get_explicit_consent_status: vi.fn(() => 'pending'),
			init,
			opt_in_capturing: vi.fn(),
			opt_out_capturing: vi.fn(),
		};

		const script = posthog({
			apiHost: 'https://events.example.com/posthog',
			id: 'phc_custom',
			region: 'us',
			scriptUrl: 'https://cdn.example.com/posthog/array.js',
			uiHost: 'https://app.example.com/posthog',
		});

		expect(script.src).toBe('https://cdn.example.com/posthog/array.js');
		expect(script.attributes).toEqual({
			crossorigin: 'anonymous',
			'data-api-host': 'https://events.example.com/posthog',
			'data-ui-host': 'https://app.example.com/posthog',
		});

		script.onLoad?.(
			createCallbackInfo({
				consents: grantedMeasurementConsentState,
				id: script.id,
			})
		);

		expect(init).toHaveBeenCalledWith('phc_custom', {
			api_host: 'https://events.example.com/posthog',
			cookieless_mode: 'on_reject',
			defaults: '2026-01-30',
			ui_host: 'https://app.example.com/posthog',
		});
	});

	it('uses explicit region UI host for custom API hosts', () => {
		const script = posthog({
			apiHost: 'https://events.example.com/posthog',
			id: 'phc_custom_region',
			region: 'us',
		});

		expect(script.attributes).toEqual({
			crossorigin: 'anonymous',
			'data-api-host': 'https://events.example.com/posthog',
			'data-ui-host': 'https://us.posthog.com',
		});
	});

	it('can wait for measurement consent before loading PostHog', () => {
		const script = posthog({
			id: 'phc_after_consent',
			loadMode: 'after-consent',
		});

		expect(script.alwaysLoad).toBeUndefined();
		expect(script.src).toBe('https://eu-assets.i.posthog.com/static/array.js');
	});

	it('can be disabled without creating a PostHog script request', () => {
		const script = posthog({
			id: 'phc_disabled',
			loadMode: 'disabled',
		});

		expect(script).toEqual({
			callbackOnly: true,
			category: 'measurement',
			id: 'posthog',
		});
		expect(script.src).toBeUndefined();
		expect(script.onBeforeLoad).toBeUndefined();
		expect(script.onLoad).toBeUndefined();
		expect(script.onConsentChange).toBeUndefined();
	});

	it('allows init options to override non-host helper defaults', () => {
		const globalRef = getTestGlobal();
		const init = vi.fn();
		globalRef.posthog = {
			capture: vi.fn(),
			get_explicit_consent_status: vi.fn(() => 'pending'),
			init,
			opt_in_capturing: vi.fn(),
			opt_out_capturing: vi.fn(),
		};

		const script = posthog({
			apiHost: 'https://eu.i.posthog.com',
			id: 'phc_overrides',
			initOptions: {
				api_host: 'https://us.i.posthog.com',
				cookieless_mode: 'always',
				defaults: '2025-05-24',
				ui_host: 'https://us.posthog.com',
			},
		});

		script.onLoad?.(
			createCallbackInfo({
				consents: deniedConsentState,
				id: script.id,
			})
		);

		expect(init).toHaveBeenCalledWith('phc_overrides', {
			api_host: 'https://eu.i.posthog.com',
			cookieless_mode: 'always',
			defaults: '2025-05-24',
			ui_host: 'https://eu.posthog.com',
		});
	});
});
