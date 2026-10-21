/**
 * @vitest-environment jsdom
 */

import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	clearAllScripts,
	deniedConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { gainsightPx } from './vendors/analytics/gainsight-px';

type PxWindow = Window & { aptrinsic: AptrinsicStub };

interface AptrinsicStub {
	(...args: unknown[]): unknown;
	q: IArguments[];
	p: string;
	c: Record<string, unknown>;
}

const getAptrinsic = function getAptrinsic(): AptrinsicStub {
	return (window as PxWindow).aptrinsic;
};

const grantedConsents = { ...deniedConsents, measurement: true };

describe('Gainsight PX production loader contract', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		Reflect.deleteProperty(window, 'aptrinsic');
	});

	it('creates no PX global, loader or storage until the mapped category is granted', () => {
		const scripts = [gainsightPx({ productKey: 'AP-PRODUCT-KEY-2' })];
		const append = vi.spyOn(document.head, 'appendChild');
		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, { ...deniedConsents, functionality: true });
		expect((window as PxWindow).aptrinsic).toBeUndefined();
		expect(append).not.toHaveBeenCalled();
		expect(document.cookie).not.toMatch(/apt\.(?:uid|sid)=/u);
		expect(localStorage.getItem('apt.uid')).toBeNull();
		expect(localStorage.getItem('apt.sid')).toBeNull();
		expect(sessionStorage.length).toBe(0);

		updateScripts(scripts, grantedConsents);
		expect(document.head.querySelector('script')?.src).toBe(
			'https://web-sdk.aptrinsic.com/api/aptrinsic.js?a=AP-PRODUCT-KEY-2'
		);
		expect(typeof getAptrinsic()).toBe('function');
	});

	it('never installs a blank product key through the core loader', () => {
		const scripts = [gainsightPx({ productKey: '  ' })];
		loadScripts(scripts, grantedConsents);
		expect(document.head.querySelector('script')).toBeNull();
		expect((window as PxWindow).aptrinsic).toBeUndefined();
	});

	it('prepares the exact vendor queue and config before appending the loader', () => {
		let beforeAppend: unknown;
		installHeadProbe((element) => {
			const url = new URL(element.src);
			if (
				url.hostname !== 'web-sdk.aptrinsic.com' ||
				url.pathname !== '/api/aptrinsic.js'
			) {
				return;
			}
			const stub = getAptrinsic();
			beforeAppend = {
				c: structuredClone(stub.c),
				p: stub.p,
				q: stub.q.map((entry) => Array.from(entry)),
			};
		});
		loadScripts(
			[
				gainsightPx({
					account: { id: 'account-123' },
					config: { localStorageCookie: true },
					productKey: 'AP-PRODUCT-KEY-2',
					user: { id: 'user-123' },
				}),
			],
			grantedConsents
		);
		expect(beforeAppend).toEqual({
			c: { enableTag: true, localStorageCookie: true },
			p: 'AP-PRODUCT-KEY-2',
			q: [
				['config', 'enableTag', true],
				['identify', { id: 'user-123' }, { id: 'account-123' }],
			],
		});
	});

	it.each([false, true])(
		'executes the SDK once and forwards enable and identify on regrant, recreated=%s',
		(recreated) => {
			const user = { id: 'user-123', plan: 'paid' };
			const account = { id: 'account-123' };
			const runtime = vi.fn();
			const executeSdk = vi.fn((element: HTMLScriptElement) => {
				const stub = getAptrinsic();
				if (stub === runtime) {
					return;
				}
				expect(stub.p).toBe('AP-PRODUCT-KEY-2');
				expect(stub.c).toEqual({ enableTag: true, fullDomainCookie: true });
				for (const entry of stub.q) {
					runtime(...Array.from(entry));
				}
				Reflect.set(window, 'aptrinsic', runtime);
				element.dispatchEvent(new Event('load'));
			});
			installHeadProbe(executeSdk);
			const createScript = () =>
				gainsightPx({
					account,
					config: { fullDomainCookie: true },
					productKey: 'AP-PRODUCT-KEY-2',
					user,
				});
			let scripts = [createScript()];
			loadScripts(scripts, grantedConsents);
			const initial = document.head.querySelector('script');
			expect(initial).not.toBeNull();
			updateScripts(scripts, grantedConsents);
			expect(document.head.querySelectorAll('script')).toHaveLength(1);
			if (recreated) {
				for (let render = 0; render < 3; render += 1) {
					updateScripts([createScript()], grantedConsents);
				}
				scripts = [createScript()];
			}
			expect(runtime.mock.calls).toEqual([
				['config', 'enableTag', true],
				['identify', user, account],
			]);

			updateScripts(scripts, deniedConsents);
			expect(runtime.mock.calls).toEqual([
				['config', 'enableTag', true],
				['identify', user, account],
				['config', 'enableTag', false],
				['reset'],
			]);
			updateScripts(scripts, deniedConsents);
			expect(runtime).toHaveBeenCalledTimes(4);
			if (recreated) {
				scripts = [createScript()];
			}

			updateScripts(scripts, grantedConsents);
			expect(executeSdk).toHaveBeenCalledTimes(1);
			expect(document.head.querySelector('script')).toBe(initial);
			expect((window as PxWindow).aptrinsic).toBe(runtime);
			expect(runtime.mock.calls.slice(4)).toEqual([
				['config', 'enableTag', true],
				['identify', user, account],
			]);
			updateScripts(scripts, { ...grantedConsents, functionality: true });
			expect(runtime).toHaveBeenCalledTimes(6);
		}
	);

	it.each([false, true])(
		'keeps the SDK across owner disposal, original owner first=%s',
		async (originalOwner) => {
			const runtime = Object.assign(vi.fn(), { __sdkBundleStarted: true });
			const executeSdk = vi.fn((element: HTMLScriptElement) => {
				Reflect.set(window, 'aptrinsic', runtime);
				element.dispatchEvent(new Event('load'));
			});
			installHeadProbe(executeSdk);
			const createScript = () => gainsightPx({ productKey: 'AP-SHARED-KEY-2' });
			const kernel = createConsentKernel();
			await kernel.commands.save(grantedConsents);
			const first = createScriptLoader({ kernel, scripts: [createScript()] });
			const second = createScriptLoader({ kernel, scripts: [createScript()] });
			try {
				(originalOwner ? first : second).dispose();
				await kernel.commands.save(deniedConsents);
				expect(runtime).toHaveBeenLastCalledWith('reset');
				await kernel.commands.save(grantedConsents);
				expect(runtime).toHaveBeenLastCalledWith('config', 'enableTag', true);
				(originalOwner ? second : first).dispose();
				const third = createScriptLoader({ kernel, scripts: [createScript()] });
				try {
					expect(executeSdk).toHaveBeenCalledTimes(1);
					expect(runtime).toHaveBeenLastCalledWith('config', 'enableTag', true);
				} finally {
					third.dispose();
				}
			} finally {
				first.dispose();
				second.dispose();
				kernel.dispose();
			}
		}
	);

	it('honors a denied shared owner until that owner disposes', async () => {
		const runtime = Object.assign(vi.fn(), { __sdkBundleStarted: true });
		Reflect.set(window, 'aptrinsic', runtime);
		const granted = createConsentKernel();
		const denied = createConsentKernel();
		await granted.commands.save(grantedConsents);
		await denied.commands.save(deniedConsents);
		const createScript = () =>
			gainsightPx({ productKey: 'AP-SHARED-DENIED-2' });
		const first = createScriptLoader({
			kernel: granted,
			scripts: [createScript()],
		});
		const second = createScriptLoader({
			kernel: denied,
			scripts: [createScript()],
		});
		try {
			expect(runtime.mock.calls).toEqual([
				['config', 'enableTag', true],
				['config', 'enableTag', false],
				['reset'],
			]);
			first.updateScripts([createScript()]);
			expect(runtime).toHaveBeenCalledTimes(3);
			second.dispose();
			expect(runtime.mock.calls.slice(3)).toEqual([
				['config', 'enableTag', true],
			]);
			expect(document.head.querySelector('script')).toBeNull();
		} finally {
			first.dispose();
			second.dispose();
			granted.dispose();
			denied.dispose();
		}
	});

	it('requests a pending SDK again after disposal when only its queue exists', () => {
		const append = vi.spyOn(document.head, 'appendChild');
		const script = gainsightPx({ productKey: 'AP-PENDING-KEY-2' });
		loadScripts([script], grantedConsents);
		const queue = getAptrinsic();
		clearAllScripts();
		loadScripts([script], deniedConsents);
		expect(getAptrinsic()).toBe(queue);
		expect(document.head.querySelector('script')).toBeNull();
		updateScripts([script], grantedConsents);
		expect(append).toHaveBeenCalledTimes(2);
		expect(document.head.querySelector('script')).not.toBeNull();
	});

	it('queues opt-out for an in-flight loader and ignores its detached load event', () => {
		const scripts = [gainsightPx({ productKey: 'AP-PRODUCT-KEY-2' })];
		loadScripts(scripts, grantedConsents);
		const initial = document.head.querySelector('script');
		updateScripts(scripts, deniedConsents);
		const queue = getAptrinsic().q.map((entry) => Array.from(entry));
		expect(queue).toEqual([
			['config', 'enableTag', true],
			['config', 'enableTag', false],
			['reset'],
		]);
		initial?.dispatchEvent(new Event('load'));
		expect(getAptrinsic().q.map((entry) => Array.from(entry))).toEqual(queue);
		expect(document.head.querySelector('script')).toBeNull();
	});

	it.each([false, true])(
		'does not execute a completed SDK again after final disposal, recreated=%s',
		(recreated) => {
			const runtime = Object.assign(vi.fn(), {
				__sdkBundleStarted: true,
				init: false,
				q: [],
			});
			const executeSdk = vi.fn((element: HTMLScriptElement) => {
				Reflect.set(window, 'aptrinsic', runtime);
				element.dispatchEvent(new Event('load'));
			});
			installHeadProbe(executeSdk);
			const createScript = () =>
				gainsightPx({
					productKey: 'AP-PRODUCT-KEY-2',
					user: { id: 'remount-user' },
				});
			let script = createScript();
			loadScripts([script], grantedConsents);
			if (recreated) {
				updateScripts([script], deniedConsents);
			}
			clearAllScripts();
			expect(document.head.querySelector('script')).toBeNull();
			if (recreated) {
				script = createScript();
			}
			runtime.mockClear();

			loadScripts([script], deniedConsents);
			expect(runtime.mock.calls).toEqual([
				['config', 'enableTag', false],
				['reset'],
			]);
			updateScripts([script], { ...deniedConsents, functionality: true });
			expect(runtime).toHaveBeenCalledTimes(2);
			updateScripts([script], grantedConsents);
			expect(executeSdk).toHaveBeenCalledTimes(1);
			expect(runtime.mock.calls.slice(2)).toEqual([
				['config', 'enableTag', true],
				['identify', { id: 'remount-user' }],
			]);
			updateScripts([script], deniedConsents);
			updateScripts([script], grantedConsents);
			expect(executeSdk).toHaveBeenCalledTimes(1);
		}
	);

	it('uses the overridden category for both installation and revocation', () => {
		const scripts = [
			gainsightPx({ category: 'experience', productKey: 'AP-KEY-2' }),
		];
		loadScripts(scripts, grantedConsents);
		expect((window as PxWindow).aptrinsic).toBeUndefined();
		updateScripts(scripts, { ...deniedConsents, experience: true });
		expect(typeof getAptrinsic()).toBe('function');
		const runtime = vi.fn();
		Reflect.set(window, 'aptrinsic', runtime);
		updateScripts(scripts, grantedConsents);
		expect(runtime).toHaveBeenCalledWith('config', 'enableTag', false);
		expect(document.head.querySelector('script')).toBeNull();
	});
});
