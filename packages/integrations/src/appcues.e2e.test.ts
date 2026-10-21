/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	deniedConsents,
	loadScripts,
	updateScripts,
	registerVendorContractCleanup,
} from './e2e-test-utils';
import { appcues } from './vendors/functional/appcues';

const granted = { ...deniedConsents, experience: true };

describe('Appcues consent lifecycle through core', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		delete window.Appcues;
		delete window.AppcuesSettings;
		localStorage.clear();
		sessionStorage.clear();
	});
	it('creates nothing before mapped consent, grants once and resets on revoke', () => {
		const scripts = [
			appcues({
				accountId: ' account/id ',
				settings: { enableURLDetection: false },
			}),
		];
		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, {
			...deniedConsents,
			functionality: true,
			marketing: true,
			measurement: true,
		});
		expect(document.querySelector('script')).toBeNull();
		expect(window.AppcuesSettings).toBeUndefined();
		expect(window.Appcues).toBeUndefined();
		expect(document.cookie).toBe('');
		expect(localStorage.length).toBe(0);
		expect(sessionStorage.length).toBe(0);
		updateScripts(scripts, granted);
		const element = document.querySelector('script');
		expect(element?.src).toBe('https://fast.appcues.com/account%2Fid.js');
		expect(window.AppcuesSettings).toEqual({ enableURLDetection: false });
		window.Appcues = { reset: vi.fn() };
		element?.dispatchEvent(new Event('load'));
		updateScripts(scripts, granted);
		expect(document.querySelectorAll('script')).toHaveLength(1);
		updateScripts(scripts, deniedConsents);
		expect(window.Appcues.reset).toHaveBeenCalledOnce();
		expect(element?.isConnected).toBe(false);
		updateScripts(scripts, granted);
		expect(document.querySelectorAll('script')).toHaveLength(1);
		expect(document.querySelector('script')).not.toBe(element);
	});
	it('never installs a blank account even with consent granted', () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		loadScripts([appcues({ accountId: '   ' })], granted);
		expect(document.querySelector('script')).toBeNull();
		expect(window.AppcuesSettings).toBeUndefined();
		expect(log).toHaveBeenCalledWith(
			'appcues: missing or invalid accountId. The script will not load.'
		);
	});

	it('removes an in-flight loader without claiming to cancel its remote execution', () => {
		const scripts = [appcues({ accountId: '123', region: 'eu' })];
		loadScripts(scripts, granted);
		const element = document.querySelector('script');
		expect(element?.src).toBe('https://fast.eu.appcues.com/123.js');
		updateScripts(scripts, deniedConsents);
		element?.dispatchEvent(new Event('load'));
		expect(element?.isConnected).toBe(false);
		expect(window.Appcues).toBeUndefined();
		updateScripts(scripts, granted);
		expect(document.querySelectorAll('script')).toHaveLength(1);
	});
});
