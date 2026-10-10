import { describe, expect, it } from 'vitest';

import {
	createCallbackInfo,
	deniedConsentState,
	expectScriptMatchesIntegration,
	expectSkippedScript,
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

	it('logs and skips the script when the tracker or script URL is missing', () => {
		for (const options of [
			{},
			{ trackerUrl: 'https://analytics.example.com/matomo.php' },
			{ scriptUrl: 'https://analytics.example.com/matomo.js' },
			{ scriptUrl: '   ', trackerUrl: '   ' },
		]) {
			expectSkippedScript(
				() => matomoAnalytics(options),
				{ category: 'measurement', id: 'matomo-analytics' },
				'matomoAnalytics: missing matomoUrl, cloudId, or explicit trackerUrl and scriptUrl'
			);
		}
	});

	it('resolves cloud IDs and queue bootstrap commands', () => {
		const globalRef = getTestGlobal();
		const script = matomoAnalytics({
			cloudId: 'my-site.matomo.cloud',
			disableCookies: true,
			enableLinkTracking: true,
			siteId: 2,
		});

		expect(script.src).toBe('https://my-site.matomo.cloud/matomo.js');
		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));
		expect(globalRef._paq).toEqual([
			['setTrackerUrl', 'https://my-site.matomo.cloud/matomo.php'],
			['setSiteId', '2'],
			['enableLinkTracking'],
			['disableCookies'],
			['trackPageView'],
		]);
	});

	it('uses consent mode with alwaysLoad and consent queue transitions', () => {
		const globalRef = getTestGlobal();
		const script = matomoAnalytics({
			defaultConsent: 'required',
			matomoUrl: 'https://analytics.example.com',
			siteId: 1,
			trackPageView: true,
		});

		expect(script.alwaysLoad).toBe(true);
		expect(script.persistAfterConsentRevoked).toBe(true);

		script.onBeforeLoad?.(
			createCallbackInfo({
				consents: deniedConsentState,
				id: script.id,
			})
		);
		script.onConsentChange?.(
			createCallbackInfo({
				consents: grantedMeasurementConsentState,
				hasConsent: true,
				id: script.id,
			})
		);
		script.onConsentChange?.(
			createCallbackInfo({
				consents: deniedConsentState,
				hasConsent: false,
				id: script.id,
			})
		);

		expect(globalRef._paq).toContainEqual(['requireConsent']);
		expect(globalRef._paq).toContainEqual(['setConsentGiven']);
		expect(globalRef._paq).toContainEqual(['forgetConsentGiven']);
	});

	it('signals a later revocation in defaultConsent given mode', () => {
		const globalRef = getTestGlobal();
		const script = matomoAnalytics({
			defaultConsent: 'given',
			matomoUrl: 'https://analytics.example.com',
			siteId: 1,
			trackPageView: true,
		});

		expect(script.alwaysLoad).toBe(true);
		expect(script.persistAfterConsentRevoked).toBe(true);

		script.onBeforeLoad?.(
			createCallbackInfo({
				consents: grantedMeasurementConsentState,
				hasConsent: true,
				id: script.id,
			})
		);
		script.onConsentChange?.(
			createCallbackInfo({
				consents: deniedConsentState,
				hasConsent: false,
				id: script.id,
			})
		);

		expect(globalRef._paq).toContainEqual(['setConsentGiven']);
		expect(globalRef._paq).not.toContainEqual(['requireConsent']);
		expect(globalRef._paq).toContainEqual(['forgetConsentGiven']);
	});

	it('does not grant Matomo consent on load for a visitor without measurement consent', () => {
		const globalRef = getTestGlobal();
		const script = matomoAnalytics({
			defaultConsent: 'given',
			matomoUrl: 'https://analytics.example.com',
			siteId: 1,
		});

		script.onBeforeLoad?.(
			createCallbackInfo({
				consents: deniedConsentState,
				hasConsent: false,
				id: script.id,
			})
		);

		expect(globalRef._paq).toContainEqual(['requireConsent']);
		expect(globalRef._paq).not.toContainEqual(['setConsentGiven']);
		expect(globalRef._paq).not.toContainEqual(['trackPageView']);
	});

	it('grants Matomo consent and tracks a page view on load when measurement is granted', () => {
		const globalRef = getTestGlobal();
		const script = matomoAnalytics({
			defaultConsent: 'given',
			matomoUrl: 'https://analytics.example.com',
			siteId: 1,
		});

		script.onBeforeLoad?.(
			createCallbackInfo({
				consents: grantedMeasurementConsentState,
				hasConsent: true,
				id: script.id,
			})
		);

		expect(globalRef._paq).toContainEqual(['setConsentGiven']);
		expect(globalRef._paq).not.toContainEqual(['requireConsent']);
		expect(
			(globalRef._paq as unknown[][]).filter(
				([command]) => command === 'trackPageView'
			)
		).toHaveLength(1);
	});

	it('does not queue another page view when an unrelated permission changes', () => {
		const globalRef = getTestGlobal();
		const script = matomoAnalytics({
			defaultConsent: 'required',
			matomoUrl: 'https://analytics.example.com',
			siteId: 1,
		});

		script.onBeforeLoad?.(
			createCallbackInfo({
				consents: deniedConsentState,
				id: script.id,
			})
		);
		script.onConsentChange?.(
			createCallbackInfo({
				consents: grantedMeasurementConsentState,
				hasConsent: true,
				id: script.id,
			})
		);
		script.onConsentChange?.(
			createCallbackInfo({
				consents: { ...grantedMeasurementConsentState, marketing: true },
				hasConsent: true,
				id: script.id,
			})
		);

		const commands = (globalRef._paq as unknown[][]).map(
			([command]) => command
		);
		expect(commands.filter((command) => command === 'trackPageView')).toEqual([
			'trackPageView',
		]);
		expect(commands.filter((command) => command === 'setConsentGiven')).toEqual(
			['setConsentGiven']
		);
	});
});
