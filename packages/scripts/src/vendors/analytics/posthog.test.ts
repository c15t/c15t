import { describe, expect, it, vi } from 'vitest';
import {
	createCallbackInfo,
	deniedConsentState,
	getTestGlobal,
	grantedMeasurementConsentState,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { posthog } from './posthog';

type PosthogStub = Window['posthog'] & { _i?: unknown[][] };

function bootstrapPosthog(script: ReturnType<typeof posthog>): PosthogStub {
	script.onBeforeLoad?.(
		createCallbackInfo({ id: script.id, consents: deniedConsentState })
	);

	return getTestGlobal().posthog as PosthogStub;
}

function installSdkSpies() {
	const globalRef = getTestGlobal();
	const optIn = vi.fn();
	const optOut = vi.fn();
	globalRef.posthog = {
		init: vi.fn(),
		opt_in_capturing: optIn,
		opt_out_capturing: optOut,
		get_explicit_consent_status: vi.fn(() => 'pending'),
		capture: vi.fn(),
	};

	return { optIn, optOut };
}

describe('posthog', () => {
	setupScriptHelperTest();

	it('queues init options as an object and syncs consent state', () => {
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

		expect(bootstrapPosthog(script)._i).toEqual([
			[
				'phc_123',
				{
					api_host: 'https://eu.i.posthog.com',
					ui_host: 'https://eu.posthog.com',
					autocapture: false,
					person_profiles: 'identified_only',
					cookieless_mode: 'on_reject',
					defaults: '2026-01-30',
				},
				'posthog',
			],
		]);

		const { optIn, optOut } = installSdkSpies();
		script.onLoad?.(
			createCallbackInfo({
				id: script.id,
				consents: deniedConsentState,
			})
		);

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
		const script = posthog({
			id: 'phc_defaults',
		});

		expect(script.src).toBe('https://eu-assets.i.posthog.com/static/array.js');
		expect(script.attributes).toEqual({
			crossorigin: 'anonymous',
			'data-api-host': 'https://eu.i.posthog.com',
			'data-ui-host': 'https://eu.posthog.com',
		});

		expect(bootstrapPosthog(script)._i).toEqual([
			[
				'phc_defaults',
				{
					api_host: 'https://eu.i.posthog.com',
					ui_host: 'https://eu.posthog.com',
					defaults: '2026-01-30',
					cookieless_mode: 'on_reject',
				},
				'posthog',
			],
		]);
	});

	it('derives US hosts from the region option', () => {
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

		expect(bootstrapPosthog(script)._i).toEqual([
			[
				'phc_us',
				{
					api_host: 'https://us.i.posthog.com',
					ui_host: 'https://us.posthog.com',
					defaults: '2026-01-30',
					cookieless_mode: 'on_reject',
				},
				'posthog',
			],
		]);
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

		expect(bootstrapPosthog(script)._i).toEqual([
			[
				'phc_custom',
				{
					api_host: 'https://events.example.com/posthog',
					ui_host: 'https://app.example.com/posthog',
					defaults: '2026-01-30',
					cookieless_mode: 'on_reject',
				},
				'posthog',
			],
		]);
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

		expect(bootstrapPosthog(script)._i).toEqual([
			[
				'phc_overrides',
				{
					api_host: 'https://eu.i.posthog.com',
					ui_host: 'https://eu.posthog.com',
					defaults: '2025-05-24',
					cookieless_mode: 'always',
				},
				'posthog',
			],
		]);
	});
});
