/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
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
