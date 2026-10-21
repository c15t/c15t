/** @vitest-environment jsdom */
import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
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
		const onReady = vi.fn();
		const scripts = [
			appcues({
				accountId: ' account/id ',
				onReady,
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
		expect(Reflect.has(window, 'AppcuesReady')).toBe(false);
		expect(onReady).not.toHaveBeenCalled();
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
		expect(onReady).toHaveBeenCalledOnce();
		expect(document.querySelectorAll('script')).toHaveLength(1);
		updateScripts(scripts, deniedConsents);
		expect(window.Appcues.reset).toHaveBeenCalledOnce();
		expect(element?.isConnected).toBe(false);
		updateScripts(scripts, granted);
		expect(document.querySelectorAll('script')).toHaveLength(1);
		expect(document.querySelector('script')).not.toBe(element);
	});
	it('identifies a visitor after the async loader is ready with stored consent', () => {
		const identify = vi.fn();
		const onReady = vi.fn(() => window.Appcues?.identify?.('current-visitor'));
		loadScripts([appcues({ accountId: '123', onReady })], granted);
		expect(window.Appcues).toBeUndefined();
		expect(onReady).not.toHaveBeenCalled();
		window.Appcues = { identify };
		document.querySelector('script')?.dispatchEvent(new Event('load'));
		expect(onReady).toHaveBeenCalledOnce();
		expect(identify).toHaveBeenCalledExactlyOnceWith('current-visitor');
	});
	it('never installs a blank account even with consent granted', () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const onReady = vi.fn();
		const script = appcues({ accountId: '   ', onReady });
		expect(script).toEqual({
			callbackOnly: true,
			category: 'experience',
			id: 'appcues',
			vendor: 'appcues',
			vendorDetails: {
				homepageUrl: 'https://www.appcues.com/',
				legalName: 'Appcues, Inc.',
				name: 'Appcues',
				privacyPolicyUrl: 'https://www.appcues.com/privacy',
			},
		});
		loadScripts([script], granted);
		expect(document.querySelector('script')).toBeNull();
		expect(window.AppcuesSettings).toBeUndefined();
		expect(window.Appcues).toBeUndefined();
		expect(Reflect.has(window, 'AppcuesReady')).toBe(false);
		expect(onReady).not.toHaveBeenCalled();
		expect(log).toHaveBeenCalledWith(
			'appcues: missing or invalid accountId. The script will not load.'
		);
	});

	it('removes an in-flight loader without claiming to cancel its remote execution', () => {
		const onReady = vi.fn(() => window.Appcues?.identify?.('revoked-visitor'));
		const scripts = [appcues({ accountId: '123', onReady, region: 'eu' })];
		loadScripts(scripts, granted);
		const element = document.querySelector('script');
		expect(element?.src).toBe('https://fast.eu.appcues.com/123.js');
		updateScripts(scripts, deniedConsents);
		element?.dispatchEvent(new Event('load'));
		expect(element?.isConnected).toBe(false);
		expect(window.Appcues).toBeUndefined();
		const identify = vi.fn();
		window.Appcues = { identify };
		element?.dispatchEvent(new Event('load'));
		expect(onReady).not.toHaveBeenCalled();
		expect(identify).not.toHaveBeenCalled();
		updateScripts(scripts, granted);
		expect(document.querySelectorAll('script')).toHaveLength(1);
		element?.dispatchEvent(new Event('load'));
		expect(onReady).not.toHaveBeenCalled();
	});

	it('uses the current helper callback during a download and does not replay it on recreation', () => {
		const revokedVisitor = vi.fn();
		const currentVisitor = vi.fn();
		loadScripts(
			[appcues({ accountId: '123', onReady: revokedVisitor })],
			granted
		);
		const element = document.querySelector('script');
		updateScripts(
			[appcues({ accountId: '123', onReady: currentVisitor })],
			granted
		);
		window.Appcues = { identify: vi.fn() };
		expect(document.querySelector('script')).toBe(element);
		element?.dispatchEvent(new Event('load'));
		expect(revokedVisitor).not.toHaveBeenCalled();
		expect(currentVisitor).toHaveBeenCalledOnce();
		const nextVisitor = vi.fn();
		const nextScripts = [appcues({ accountId: '123', onReady: nextVisitor })];
		updateScripts(nextScripts, granted);
		element?.dispatchEvent(new Event('load'));
		expect(nextVisitor).not.toHaveBeenCalled();
		const reset = vi.fn();
		window.Appcues = { reset };
		updateScripts(nextScripts, deniedConsents);
		expect(reset).toHaveBeenCalledOnce();
	});

	it('does not revive an old visitor callback after revoke, recreation and regrant', () => {
		const identify = vi.fn();
		const oldReady = vi.fn(() => window.Appcues?.identify?.('old-visitor'));
		const oldScripts = [appcues({ accountId: '123', onReady: oldReady })];
		loadScripts(oldScripts, granted);
		const oldElement = document.querySelector('script');
		updateScripts(oldScripts, deniedConsents);
		const currentReady = vi.fn(() =>
			window.Appcues?.identify?.('current-visitor')
		);
		const currentScripts = [
			appcues({ accountId: '123', onReady: currentReady }),
		];
		updateScripts(currentScripts, deniedConsents);
		updateScripts(currentScripts, granted);
		window.Appcues = { identify };
		oldElement?.dispatchEvent(new Event('load'));
		expect(oldReady).not.toHaveBeenCalled();
		expect(currentReady).not.toHaveBeenCalled();
		expect(identify).not.toHaveBeenCalled();
		document.querySelector('script')?.dispatchEvent(new Event('load'));
		expect(currentReady).toHaveBeenCalledOnce();
		expect(identify).toHaveBeenCalledExactlyOnceWith('current-visitor');
	});

	it('does not report readiness when the account loader fails or exposes no API', () => {
		const onReady = vi.fn();
		const scripts = [appcues({ accountId: '123', onReady })];
		loadScripts(scripts, granted);
		document.querySelector('script')?.dispatchEvent(new Event('error'));
		expect(onReady).not.toHaveBeenCalled();
		updateScripts(scripts, deniedConsents);
		updateScripts(scripts, granted);
		document.querySelector('script')?.dispatchEvent(new Event('load'));
		expect(onReady).not.toHaveBeenCalled();
	});

	it.each(['remove', 'dispose'])(
		'suppresses readiness after %s during a real kernel download',
		async (action) => {
			const kernel = createConsentKernel();
			await kernel.commands.save(granted);
			const identify = vi.fn();
			const onReady = vi.fn(() =>
				window.Appcues?.identify?.('removed-visitor')
			);
			const loader = createScriptLoader({
				kernel,
				scripts: [appcues({ accountId: '123', onReady })],
			});
			try {
				const element = document.querySelector('script');
				if (action === 'dispose') {
					loader.dispose();
				} else {
					loader.updateScripts([]);
				}
				window.Appcues = { identify };
				element?.dispatchEvent(new Event('load'));
				expect(onReady).not.toHaveBeenCalled();
				expect(identify).not.toHaveBeenCalled();
			} finally {
				loader.dispose();
				kernel.dispose();
			}
		}
	);

	it('observes live kernel revocation before a late load and resets after readiness', async () => {
		const kernel = createConsentKernel();
		await kernel.commands.save(granted);
		const identify = vi.fn();
		const reset = vi.fn();
		const onReady = vi.fn(() => window.Appcues?.identify?.('current-visitor'));
		const loader = createScriptLoader({
			kernel,
			scripts: [appcues({ accountId: '123', onReady })],
		});
		try {
			const revokedElement = document.querySelector('script');
			await kernel.commands.save(deniedConsents);
			window.Appcues = { identify, reset };
			revokedElement?.dispatchEvent(new Event('load'));
			expect(onReady).not.toHaveBeenCalled();
			expect(identify).not.toHaveBeenCalled();
			await kernel.commands.save(granted);
			const currentElement = document.querySelector('script');
			currentElement?.dispatchEvent(new Event('load'));
			currentElement?.dispatchEvent(new Event('load'));
			expect(identify).toHaveBeenCalledExactlyOnceWith('current-visitor');
			await kernel.commands.save(deniedConsents);
			expect(reset).toHaveBeenCalledOnce();
			revokedElement?.dispatchEvent(new Event('load'));
			currentElement?.dispatchEvent(new Event('load'));
			expect(onReady).toHaveBeenCalledOnce();
		} finally {
			loader.dispose();
			kernel.dispose();
		}
	});
});
