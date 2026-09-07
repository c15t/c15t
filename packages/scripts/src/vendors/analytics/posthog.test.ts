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

const bootstrapPosthog = function bootstrapPosthog(
	script: ReturnType<typeof posthog>
): PosthogStub {
	script.onBeforeLoad?.(
		createCallbackInfo({ consents: deniedConsentState, id: script.id })
	);

	return getTestGlobal().posthog as PosthogStub;
};

const installSdkSpies = function installSdkSpies() {
	const globalRef = getTestGlobal();
	const optIn = vi.fn();
	const optOut = vi.fn();
	globalRef.posthog = {
		capture: vi.fn(),
		get_explicit_consent_status: vi.fn(() => 'pending'),
		init: vi.fn(),
		opt_in_capturing: optIn,
		opt_out_capturing: optOut,
	};

	return { optIn, optOut };
};

describe('posthog', () => {
	setupScriptHelperTest();

	it('queues init options as an object and syncs consent state', () => {
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

		expect(bootstrapPosthog(script)._i).toEqual([
			[
				'phc_123',
				{
					api_host: 'https://eu.i.posthog.com',
					autocapture: false,
					cookieless_mode: 'on_reject',
					defaults: '2026-01-30',
					person_profiles: 'identified_only',
					ui_host: 'https://eu.posthog.com',
				},
				'posthog',
			],
		]);

		const { optIn, optOut } = installSdkSpies();
		script.onLoad?.(
			createCallbackInfo({
				consents: deniedConsentState,
				id: script.id,
			})
		);

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
					cookieless_mode: 'on_reject',
					defaults: '2026-01-30',
					ui_host: 'https://eu.posthog.com',
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
					cookieless_mode: 'on_reject',
					defaults: '2026-01-30',
					ui_host: 'https://us.posthog.com',
				},
				'posthog',
			],
		]);
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

		expect(bootstrapPosthog(script)._i).toEqual([
			[
				'phc_custom',
				{
					api_host: 'https://events.example.com/posthog',
					cookieless_mode: 'on_reject',
					defaults: '2026-01-30',
					ui_host: 'https://app.example.com/posthog',
				},
				'posthog',
			],
		]);
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

		expect(bootstrapPosthog(script)._i).toEqual([
			[
				'phc_overrides',
				{
					api_host: 'https://eu.i.posthog.com',
					cookieless_mode: 'always',
					defaults: '2025-05-24',
					ui_host: 'https://eu.posthog.com',
				},
				'posthog',
			],
		]);
	});
});
