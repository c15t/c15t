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

	it('trims valid tokens before resolving the manifest', () => {
		const globalRef = getTestGlobal();
		const init = vi.fn();
		globalRef.mixpanel = {
			init,
			opt_in_tracking: vi.fn(),
			opt_out_tracking: vi.fn(),
		};
		const script = mixpanelAnalytics({
			token: ` ${MOCK_MIXPANEL_TOKEN} `,
		});

		script.onLoad?.(
			createCallbackInfo({
				id: script.id,
				consents: deniedConsentState,
			})
		);

		expect(init).toHaveBeenCalledWith(MOCK_MIXPANEL_TOKEN, {});
	});

	it('throws for blank or malformed tokens', () => {
		expect(() => mixpanelAnalytics({ token: '   ' })).toThrow(
			'mixpanelAnalytics: token must be a non-empty 32-character hexadecimal string'
		);
		expect(() => mixpanelAnalytics({ token: 'not-a-valid-token' })).toThrow(
			'mixpanelAnalytics: token must be a non-empty 32-character hexadecimal string'
		);
	});

	it('initializes mixpanel and syncs consent state through opt methods', () => {
		const globalRef = getTestGlobal();
		const init = vi.fn();
		const optIn = vi.fn();
		const optOut = vi.fn();
		globalRef.mixpanel = {
			init,
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
		expect(init).toHaveBeenCalledWith(MOCK_MIXPANEL_TOKEN, {
			debug: true,
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
});
