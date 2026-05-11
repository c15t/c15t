import { describe, expect, it } from 'vitest';
import {
	createCallbackInfo,
	deniedConsentState,
	expectScriptMatchesIntegration,
	getTestGlobal,
	grantedMeasurementConsentState,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { matomoAnalytics } from './matomo-analytics';

describe('matomoAnalytics', () => {
	setupScriptHelperTest();

	it('matches registry metadata with self-hosted defaults', () => {
		const script = matomoAnalytics({
			matomoUrl: 'https://analytics.example.com',
			siteId: 1,
		});

		expectScriptMatchesIntegration('matomoAnalytics', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://analytics.example.com/matomo.js',
		});
	});

	it('resolves cloud IDs and queue bootstrap commands', () => {
		const globalRef = getTestGlobal();
		const script = matomoAnalytics({
			cloudId: 'my-site.matomo.cloud',
			siteId: 2,
			enableLinkTracking: true,
			disableCookies: true,
		});

		expect(script.src).toBe('https://cdn.matomo.cloud/my-site.matomo.cloud/matomo.js');
		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));
		expect(globalRef._paq).toEqual([
			['setTrackerUrl', 'https://cdn.matomo.cloud/my-site.matomo.cloud/matomo.php'],
			['setSiteId', '2'],
			['enableLinkTracking'],
			['disableCookies'],
			['trackPageView'],
		]);
	});

	it('uses consent mode with alwaysLoad and consent queue transitions', () => {
		const globalRef = getTestGlobal();
		const script = matomoAnalytics({
			matomoUrl: 'https://analytics.example.com',
			defaultConsent: 'required',
			trackPageView: true,
		});

		expect(script.alwaysLoad).toBe(true);
		expect(script.persistAfterConsentRevoked).toBe(true);

		script.onBeforeLoad?.(
			createCallbackInfo({
				id: script.id,
				consents: deniedConsentState,
			})
		);
		script.onConsentChange?.(
			createCallbackInfo({
				id: script.id,
				hasConsent: true,
				consents: grantedMeasurementConsentState,
			})
		);
		script.onConsentChange?.(
			createCallbackInfo({
				id: script.id,
				hasConsent: false,
				consents: deniedConsentState,
			})
		);

		expect(globalRef._paq).toContainEqual(['requireConsent']);
		expect(globalRef._paq).toContainEqual(['setConsentGiven']);
		expect(globalRef._paq).toContainEqual(['forgetConsentGiven']);
	});
});
