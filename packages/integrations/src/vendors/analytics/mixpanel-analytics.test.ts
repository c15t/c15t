import { describe, expect, it, vi } from 'vitest';

import {
	createCallbackInfo,
	deniedConsentState,
	expectScriptMatchesIntegration,
	expectSkippedScript,
	getTestGlobal,
	grantedMeasurementConsentState,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { mixpanelAnalytics } from './mixpanel-analytics';

const MOCK_MIXPANEL_TOKEN = '1234567890abcdef1234567890abcdef';

describe('mixpanelAnalytics', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default loader URL', () => {
		const script = mixpanelAnalytics({
			token: MOCK_MIXPANEL_TOKEN,
		});

		expectScriptMatchesIntegration('mixpanelAnalytics', script, {
			alwaysLoad: true,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js',
		});
	});

	it('seeds the snippet contract with the trimmed token before load', () => {
		const globalRef = getTestGlobal();
		const script = mixpanelAnalytics({
			token: ` ${MOCK_MIXPANEL_TOKEN} `,
		});

		script.onBeforeLoad?.(
			createCallbackInfo({
				consents: deniedConsentState,
				id: script.id,
			})
		);

		const mixpanel = globalRef.mixpanel as Window['mixpanel'];
		expect(mixpanel?.__SV).toBe(1.2);
		expect(mixpanel?._i).toEqual([
			[
				MOCK_MIXPANEL_TOKEN,
				{
					opt_out_persistence_by_default: true,
					opt_out_tracking_by_default: true,
				},
				'mixpanel',
			],
		]);
	});

	it('logs and skips the script for blank or malformed tokens', () => {
		expectSkippedScript(
			() => mixpanelAnalytics({ token: '   ' }),
			{ category: 'measurement', id: 'mixpanel-analytics' },
			'mixpanelAnalytics: missing or invalid token'
		);
		expectSkippedScript(
			() => mixpanelAnalytics({ token: 'not-a-valid-token' }),
			{ category: 'measurement', id: 'mixpanel-analytics' },
			'mixpanelAnalytics: token must be a 32-character hexadecimal string'
		);
	});

	it('registers init options in _i for the snippet init registry', () => {
		const globalRef = getTestGlobal();
		const script = mixpanelAnalytics({
			initOptions: { debug: true },
			token: MOCK_MIXPANEL_TOKEN,
		});

		script.onBeforeLoad?.(
			createCallbackInfo({
				consents: deniedConsentState,
				id: script.id,
			})
		);

		expect((globalRef.mixpanel as Window['mixpanel'])?._i).toEqual([
			[
				MOCK_MIXPANEL_TOKEN,
				{
					debug: true,
					opt_out_persistence_by_default: true,
					opt_out_tracking_by_default: true,
				},
				'mixpanel',
			],
		]);
	});

	it('lets init options turn off the opt-out defaults', () => {
		const globalRef = getTestGlobal();
		const script = mixpanelAnalytics({
			initOptions: {
				opt_out_persistence_by_default: false,
				opt_out_tracking_by_default: false,
			},
			token: MOCK_MIXPANEL_TOKEN,
		});

		script.onBeforeLoad?.(
			createCallbackInfo({
				consents: deniedConsentState,
				id: script.id,
			})
		);

		expect((globalRef.mixpanel as Window['mixpanel'])?._i).toEqual([
			[
				MOCK_MIXPANEL_TOKEN,
				{
					opt_out_persistence_by_default: false,
					opt_out_tracking_by_default: false,
				},
				'mixpanel',
			],
		]);
	});

	it('keeps the opt-out defaults when init options set them to undefined', () => {
		const globalRef = getTestGlobal();
		const script = mixpanelAnalytics({
			initOptions: {
				opt_out_persistence_by_default: undefined,
				opt_out_tracking_by_default: undefined,
			},
			token: MOCK_MIXPANEL_TOKEN,
		});

		script.onBeforeLoad?.(
			createCallbackInfo({
				consents: deniedConsentState,
				id: script.id,
			})
		);

		expect((globalRef.mixpanel as Window['mixpanel'])?._i).toEqual([
			[
				MOCK_MIXPANEL_TOKEN,
				{
					opt_out_persistence_by_default: true,
					opt_out_tracking_by_default: true,
				},
				'mixpanel',
			],
		]);
	});

	it('queues the opt-in call before load when consent is granted', () => {
		const globalRef = getTestGlobal();
		const script = mixpanelAnalytics({ token: MOCK_MIXPANEL_TOKEN });

		script.onBeforeLoad?.(
			createCallbackInfo({
				consents: grantedMeasurementConsentState,
				hasConsent: true,
				id: script.id,
			})
		);

		expect(Array.from(globalRef.mixpanel as unknown[])).toEqual([
			['opt_in_tracking'],
		]);
	});

	it('queues the opt-out call before load when consent is denied', () => {
		const globalRef = getTestGlobal();
		const script = mixpanelAnalytics({ token: MOCK_MIXPANEL_TOKEN });

		script.onBeforeLoad?.(
			createCallbackInfo({
				consents: deniedConsentState,
				id: script.id,
			})
		);

		expect(Array.from(globalRef.mixpanel as unknown[])).toEqual([
			['opt_out_tracking'],
		]);
	});

	it('syncs later consent changes through the SDK opt methods', () => {
		const globalRef = getTestGlobal();
		const optIn = vi.fn();
		const optOut = vi.fn();
		globalRef.mixpanel = {
			opt_in_tracking: optIn,
			opt_out_tracking: optOut,
		};

		const script = mixpanelAnalytics({
			initOptions: { debug: true },
			token: MOCK_MIXPANEL_TOKEN,
		});

		script.onBeforeLoad?.(
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
});
