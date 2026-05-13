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
			'data-ui-host': 'https://eu.posthog.com',
		});

		script.onLoad?.(
			createCallbackInfo({
				id: script.id,
				consents: deniedConsentState,
			})
		);

		expect(init).toHaveBeenCalledWith(globalRef.posthog, 'phc_123', {
			api_host: 'https://eu.i.posthog.com',
			ui_host: 'https://eu.posthog.com',
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
			'data-ui-host': 'https://eu.posthog.com',
		});

		script.onLoad?.(
			createCallbackInfo({
				id: script.id,
				consents: grantedMeasurementConsentState,
			})
		);

		expect(init).toHaveBeenCalledWith('phc_defaults', {
			api_host: 'https://eu.i.posthog.com',
			ui_host: 'https://eu.posthog.com',
			defaults: '2026-01-30',
			cookieless_mode: 'on_reject',
		});
	});

	it('derives US hosts from the region option', () => {
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
				id: script.id,
				consents: grantedMeasurementConsentState,
			})
		);

		expect(init).toHaveBeenCalledWith('phc_us', {
			api_host: 'https://us.i.posthog.com',
			ui_host: 'https://us.posthog.com',
			defaults: '2026-01-30',
			cookieless_mode: 'on_reject',
		});
	});

	it('derives the bootstrap script URL from an explicit API host', () => {
		const script = posthog({
			id: 'phc_us_host',
			apiHost: 'https://us.i.posthog.com',
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
			init,
			opt_in_capturing: vi.fn(),
			opt_out_capturing: vi.fn(),
			get_explicit_consent_status: vi.fn(() => 'pending'),
			capture: vi.fn(),
		};

		const script = posthog({
			id: 'phc_custom',
			region: 'us',
			apiHost: 'https://events.example.com/posthog',
			uiHost: 'https://app.example.com/posthog',
			scriptUrl: 'https://cdn.example.com/posthog/array.js',
		});

		expect(script.src).toBe('https://cdn.example.com/posthog/array.js');
		expect(script.attributes).toEqual({
			crossorigin: 'anonymous',
			'data-api-host': 'https://events.example.com/posthog',
			'data-ui-host': 'https://app.example.com/posthog',
		});

		script.onLoad?.(
			createCallbackInfo({
				id: script.id,
				consents: grantedMeasurementConsentState,
			})
		);

		expect(init).toHaveBeenCalledWith('phc_custom', {
			api_host: 'https://events.example.com/posthog',
			ui_host: 'https://app.example.com/posthog',
			defaults: '2026-01-30',
			cookieless_mode: 'on_reject',
		});
	});

	it('uses explicit region UI host for custom API hosts', () => {
		const script = posthog({
			id: 'phc_custom_region',
			region: 'us',
			apiHost: 'https://events.example.com/posthog',
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
			id: 'posthog',
			category: 'measurement',
			callbackOnly: true,
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
				ui_host: 'https://us.posthog.com',
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
			api_host: 'https://eu.i.posthog.com',
			ui_host: 'https://eu.posthog.com',
			defaults: '2025-05-24',
			cookieless_mode: 'always',
		});
	});
});
