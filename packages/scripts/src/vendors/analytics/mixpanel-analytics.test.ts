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

describe('mixpanelAnalytics', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default loader URL', () => {
		const script = mixpanelAnalytics({
			token: '1234567890abcdef1234567890abcdef',
		});

		expectScriptMatchesIntegration('mixpanelAnalytics', script, {
			alwaysLoad: true,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js',
		});
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
			token: '1234567890abcdef1234567890abcdef',
			initOptions: { debug: true },
		});

		script.onLoad?.(
			createCallbackInfo({
				id: script.id,
				consents: deniedConsentState,
			})
		);
		expect(init).toHaveBeenCalledWith('1234567890abcdef1234567890abcdef', {
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
