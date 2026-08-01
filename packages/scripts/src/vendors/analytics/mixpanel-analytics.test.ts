import { describe, expect, it, vi } from 'vitest';
import {
	createCallbackInfo,
	deniedConsentState,
	expectScriptMatchesIntegration,
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
				id: script.id,
				consents: deniedConsentState,
			})
		);

		const mixpanel = globalRef.mixpanel as Window['mixpanel'];
		expect(mixpanel?.__SV).toBe(1.2);
		expect(mixpanel?._i).toEqual([[MOCK_MIXPANEL_TOKEN, {}, 'mixpanel']]);
	});

	it('throws for blank or malformed tokens', () => {
		expect(() => mixpanelAnalytics({ token: '   ' })).toThrow(
			'mixpanelAnalytics: token must be a non-empty 32-character hexadecimal string'
		);
		expect(() => mixpanelAnalytics({ token: 'not-a-valid-token' })).toThrow(
			'mixpanelAnalytics: token must be a non-empty 32-character hexadecimal string'
		);
	});

	it('registers init options in _i for the snippet init registry', () => {
		const globalRef = getTestGlobal();
		const script = mixpanelAnalytics({
			token: MOCK_MIXPANEL_TOKEN,
			initOptions: { debug: true },
		});

		script.onBeforeLoad?.(
			createCallbackInfo({
				id: script.id,
				consents: deniedConsentState,
			})
		);

		expect((globalRef.mixpanel as Window['mixpanel'])?._i).toEqual([
			[MOCK_MIXPANEL_TOKEN, { debug: true }, 'mixpanel'],
		]);
	});

	it('syncs consent state through the SDK opt methods', () => {
		const globalRef = getTestGlobal();
		const optIn = vi.fn();
		const optOut = vi.fn();
		globalRef.mixpanel = {
			opt_in_tracking: optIn,
			opt_out_tracking: optOut,
		};

		const script = mixpanelAnalytics({
			token: MOCK_MIXPANEL_TOKEN,
			initOptions: { debug: true },
		});

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
});
