/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';

import { isolateHubSpotPage } from './__tests__/hubspot-page';
import {
	deniedConsents,
	grantedMarketingConsents,
	grantedMeasurementConsents,
	loadScripts,
	updateScripts,
	registerVendorContractCleanup,
} from './e2e-test-utils';
import { hubspot } from './vendors/analytics/hubspot';

describe('HubSpot core loader consent contract', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		for (const key of [
			'_hsp',
			'_hsq',
			'disableHubSpotCookieBanner',
			'HubSpotConversations',
			'hsConversationsOnReady',
			'hsConversationsSettings',
		]) {
			Reflect.deleteProperty(window, key);
		}
	});
	isolateHubSpotPage();

	it('creates no vendor globals, requests or storage before mapped consent', () => {
		const scripts = [hubspot({ portalId: '53' })];
		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, grantedMeasurementConsents);
		expect(document.querySelector('script')).toBeNull();
		for (const key of [
			'_hsp',
			'_hsq',
			'disableHubSpotCookieBanner',
			'HubSpotConversations',
			'hsConversationsOnReady',
			'hsConversationsSettings',
		]) {
			expect(key in window).toBe(false);
		}
		expect(document.cookie).toBe('');
		updateScripts(scripts, grantedMarketingConsents);
		const element = document.querySelector('script');
		expect(element?.src).toBe('https://js.hs-scripts.com/53.js');
		element?.dispatchEvent(new Event('load'));
		updateScripts(scripts, grantedMarketingConsents);
		expect(document.querySelectorAll('script')).toHaveLength(1);
	});
	it('retains one loader across in-flight revoke and regrant', () => {
		const scripts = [hubspot({ portalId: '53' })];
		loadScripts(scripts, grantedMarketingConsents);
		const old = document.querySelector('script');
		updateScripts(scripts, deniedConsents);
		expect(old?.isConnected).toBe(true);
		old?.dispatchEvent(new Event('load'));
		expect(document.querySelector('script')).toBe(old);
		updateScripts(scripts, grantedMarketingConsents);
		const current = document.querySelector('script');
		expect(current).toBe(old);
		current?.dispatchEvent(new Event('load'));
		updateScripts(scripts, grantedMarketingConsents);
		expect(document.querySelectorAll('script')).toHaveLength(1);
	});
});
