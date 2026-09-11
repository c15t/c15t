/*
 * @vitest-environment jsdom
 * @vitest-environment-options {"url":"https://app.example.com/shop/cart"}
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	choiceRecords,
	matchedResolution,
	optOutRule,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../kernel';
import {
	PENDING_SAVES_STORAGE_KEY,
	STORAGE_KEY,
	STORAGE_KEY_V2,
} from '../../../libs/storage-keys';
import type { ConsentKernel } from '../../../types';
import { createClearOnRevocation } from '../index';
import type { ClearOnRevocationConfig } from '../types';

const disposals: (() => void)[] = [];
const attach = (
	config: ClearOnRevocationConfig,
	kernel: ConsentKernel = createConsentKernel(),
	storageKey?: string
) => {
	const cleanup = createClearOnRevocation({
		config,
		kernel,
		storageConfig: { storageKey },
	});
	disposals.push(cleanup.dispose, kernel.dispose);
	return { cleanup, kernel };
};

beforeEach(() => {
	window.localStorage.clear();
	window.sessionStorage.clear();
});

afterEach(() => {
	for (const dispose of disposals.splice(0)) {
		dispose();
	}
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	for (const cookie of document.cookie.split(';')) {
		const name = cookie.split('=')[0]?.trim();
		for (const path of ['/', '/shop', '/shop/', '/shop/cart']) {
			for (const domain of [
				'',
				'; Domain=app.example.com',
				'; Domain=example.com',
			]) {
				document.cookie = `${name}=; Max-Age=0; Path=${path}${domain}; Secure`;
			}
		}
	}
});

describe('cookie cleanup', () => {
	test('removes scoped cookies and raw encoded names while preserving unrelated cookies', () => {
		document.cookie = '_ga=root; Path=/';
		document.cookie = '_ga=parent; Domain=.example.com; Path=/shop';
		document.cookie = '_ga_child=value; Path=/shop/';
		document.cookie = '_ga%2Fencoded=value; Path=/shop/cart';
		document.cookie = 'account=session; Path=/';
		attach({ measurement: { cookies: ['_ga*'] } });
		expect(document.cookie).toBe('account=session');
	});

	test('honors an explicit domain and path', () => {
		document.cookie = 'tracking=root; Path=/';
		document.cookie = 'tracking=host; Path=/shop';
		document.cookie = 'tracking=parent; Domain=example.com; Path=/shop';
		attach({
			measurement: {
				cookies: [{ domain: '.example.com', name: 'tracking', path: '/shop' }],
			},
		});
		expect(document.cookie).toContain('tracking=root');
		expect(document.cookie).toContain('tracking=host');
		expect(document.cookie).not.toContain('tracking=parent');
	});

	test('deletes exact names on paths outside the current page', () => {
		document.cookie = 'hidden=value; Path=/other';
		attach({ measurement: { cookies: [{ name: 'hidden', path: '/other' }] } });
		window.history.replaceState(null, '', '/other');
		expect(document.cookie).not.toContain('hidden=');
		window.history.replaceState(null, '', '/shop/cart');
	});

	test('deletes secure cookie prefixes', () => {
		document.cookie = '__Host-track=value; Secure; Path=/';
		document.cookie = '__Secure-track=value; Secure; Path=/';
		expect(document.cookie).toContain('__Host-track');
		attach({ measurement: { cookies: ['__Host-track', '__Secure-track'] } });
		expect(document.cookie).toBe('');
	});

	test('ignores wildcard-only, interior wildcard, and cookie attribute injection', () => {
		document.cookie = 'tracking=value; Path=/';
		attach({
			measurement: {
				cookies: [
					'*',
					'tr*ing',
					'tracking; Path=/',
					'tracking=value',
					{ domain: 'example.com; Path=/', name: 'tracking' },
					{ name: 'tracking', path: '/; Domain=example.com' },
				],
			},
		});
		expect(document.cookie).toBe('tracking=value');
	});

	test('allows partitioned deletion writes in cross-site frames', () => {
		const setter = vi.spyOn(document, 'cookie', 'set');
		attach({
			measurement: {
				cookies: [
					{ domain: '', name: 'tracking', partitioned: true, path: '/' },
				],
			},
		});
		expect(setter).toHaveBeenCalledWith(
			expect.stringContaining('; Secure; SameSite=None; Partitioned')
		);
	});
});

describe('web storage cleanup', () => {
	test('matches exact and prefix names without skipping keys as indexes shift', () => {
		for (const key of [
			'track:1',
			'track:2',
			'track:3',
			'analytics 用户 @ key',
			'account',
		]) {
			window.localStorage.setItem(key, 'value');
			window.sessionStorage.setItem(key, 'value');
		}
		attach({
			measurement: {
				localStorage: ['track:*', 'analytics 用户 @ key'],
				sessionStorage: ['track:1'],
			},
		});
		expect(Object.keys(window.localStorage)).toEqual(['account']);
		expect(window.sessionStorage.getItem('track:1')).toBeNull();
		expect(window.sessionStorage.getItem('track:2')).toBe('value');
	});

	test('protects default and custom consent records, including wildcard matches', () => {
		const protectedKeys = [
			STORAGE_KEY_V2,
			STORAGE_KEY,
			PENDING_SAVES_STORAGE_KEY,
			'c15t-notice',
			'c15t-privacy',
			'custom',
			'custom-notice',
			'custom-privacy',
		];
		for (const key of [...protectedKeys, 'c15t-analytics']) {
			window.localStorage.setItem(key, 'value');
			document.cookie = `${key}=value; Path=/`;
		}
		attach(
			{
				measurement: {
					cookies: ['c15t*', 'custom*', STORAGE_KEY],
					localStorage: ['c15t*', 'custom*', STORAGE_KEY],
				},
			},
			createConsentKernel(),
			'custom'
		);
		for (const key of protectedKeys) {
			expect(window.localStorage.getItem(key)).toBe('value');
		}
		for (const key of protectedKeys.filter(
			(value) => value !== PENDING_SAVES_STORAGE_KEY
		)) {
			expect(document.cookie).toContain(`${key}=value`);
		}
		expect(window.localStorage.getItem('c15t-analytics')).toBeNull();
		expect(document.cookie).not.toContain('c15t-analytics');
	});

	test('continues after one storage backend is inaccessible', () => {
		window.sessionStorage.setItem('tracking', 'value');
		vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
			throw new Error('Denied');
		});
		attach({
			measurement: { localStorage: ['tracking'], sessionStorage: ['tracking'] },
		});
		expect(window.sessionStorage.getItem('tracking')).toBeNull();
	});

	test('continues after an individual removal or cookie write fails', () => {
		window.localStorage.setItem('blocked', 'value');
		window.localStorage.setItem('tracking', 'value');
		const storage = window.localStorage;
		const removeItem = vi.fn((key: string) => {
			if (key === 'blocked') {
				throw new Error('Denied');
			}
			storage.removeItem(key);
		});
		vi.spyOn(window, 'localStorage', 'get').mockReturnValue({
			clear: storage.clear.bind(storage),
			getItem: storage.getItem.bind(storage),
			key: storage.key.bind(storage),
			length: storage.length,
			removeItem,
			setItem: storage.setItem.bind(storage),
		});
		vi.spyOn(document, 'cookie', 'set').mockImplementation(() => {
			throw new Error('Denied');
		});
		attach({
			measurement: {
				cookies: ['tracking'],
				localStorage: ['blocked', 'tracking'],
			},
		});
		expect(window.localStorage.getItem('blocked')).toBe('value');
		expect(window.localStorage.getItem('tracking')).toBeNull();
	});
});

describe('consent lifecycle', () => {
	test('sweeps denied data once, then waits for a granted-to-denied transition', async () => {
		window.localStorage.setItem('tracking', 'initial');
		const { kernel } = attach({ measurement: { localStorage: ['tracking'] } });
		expect(window.localStorage.getItem('tracking')).toBeNull();
		window.localStorage.setItem('tracking', 'later');
		kernel.set.activeUI('dialog');
		kernel.set.draft({ measurement: true });
		kernel.set.draft({ measurement: false });
		await kernel.commands.save({ measurement: false });
		expect(window.localStorage.getItem('tracking')).toBe('later');
		await kernel.commands.save({ measurement: true });
		expect(window.localStorage.getItem('tracking')).toBe('later');
		await kernel.commands.save({ measurement: false });
		expect(window.localStorage.getItem('tracking')).toBeNull();
	});

	test('does not clear granted data on attachment or disposal', async () => {
		window.localStorage.setItem('tracking', 'value');
		const kernel = createConsentKernel({
			initialRecords: choiceRecords({ measurement: true }),
		});
		const { cleanup } = attach(
			{ measurement: { localStorage: ['tracking'] } },
			kernel
		);
		expect(window.localStorage.getItem('tracking')).toBe('value');
		cleanup.dispose();
		cleanup.dispose();
		await kernel.commands.save({ measurement: false });
		expect(window.localStorage.getItem('tracking')).toBe('value');
	});

	test('waits for policy resolution before treating provisional denial as destructive', async () => {
		window.localStorage.setItem('tracking', 'value');
		const kernel = createConsentKernel({ initialPolicyPending: true });
		attach({ measurement: { localStorage: ['tracking'] } }, kernel);
		kernel.set.activeUI('dialog');
		expect(window.localStorage.getItem('tracking')).toBe('value');
		await kernel.commands.init();
		expect(kernel.getSnapshot().policyPending).toBe(false);
		expect(window.localStorage.getItem('tracking')).toBeNull();
	});

	test('preserves data when resolved policy permits the category', async () => {
		window.localStorage.setItem('tracking', 'value');
		const kernel = createConsentKernel({
			initialPolicyPending: true,
			initialPolicyResolution: matchedResolution(optOutRule()),
		});
		attach({ measurement: { localStorage: ['tracking'] } }, kernel);
		await kernel.commands.init();
		expect(window.localStorage.getItem('tracking')).toBe('value');
	});

	test('preserves hydrated grants while their matching remote policy is pending', async () => {
		window.localStorage.setItem('tracking', 'value');
		const resolution = matchedResolution(optOutRule());
		const kernel = createConsentKernel({
			initialPolicyPending: true,
			initialRecords: choiceRecords(
				{ measurement: true },
				{
					fingerprint: resolution.fingerprints.choice,
				}
			),
			transport: {
				init: () =>
					Promise.resolve({ policyResolution: { ...resolution, version: 1 } }),
			},
		});
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(false);
		attach({ measurement: { localStorage: ['tracking'] } }, kernel);
		expect(window.localStorage.getItem('tracking')).toBe('value');
		await kernel.commands.init();
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(true);
		expect(window.localStorage.getItem('tracking')).toBe('value');
	});

	test('clears data after hydrated permission loss without an explicit save', () => {
		window.localStorage.setItem('tracking', 'value');
		const kernel = createConsentKernel({
			initialRecords: choiceRecords({ measurement: true }),
		});
		attach({ measurement: { localStorage: ['tracking'] } }, kernel);
		kernel.hydrate(choiceRecords({ measurement: false }));
		expect(window.localStorage.getItem('tracking')).toBeNull();
	});

	test('is inert on the server', () => {
		window.localStorage.setItem('tracking', 'value');
		const storage = window.localStorage;
		vi.stubGlobal('window', undefined);
		attach({ measurement: { localStorage: ['tracking'] } });
		expect(storage.getItem('tracking')).toBe('value');
	});
});
