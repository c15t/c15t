/**
 * @fileoverview Tests for clear-on-revocation pure logic
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRootDomain } from '../../cookie/domain-utils';
import { deleteCookie } from '../../cookie/operations';
import {
	clearTargetsForCategory,
	matchesPattern,
	runClearOnRevocation,
} from '../core';
import type { ClearOnRevocationConfig } from '../types';

vi.mock('../../cookie/operations', () => ({
	deleteCookie: vi.fn(),
}));

vi.mock('../../cookie/domain-utils', () => ({
	getRootDomain: vi.fn(() => ''),
}));

const deleteCookieMock = vi.mocked(deleteCookie);
const getRootDomainMock = vi.mocked(getRootDomain);

function createFakeStorage(initial: Record<string, string> = {}): Storage {
	const store = new Map(Object.entries(initial));

	return {
		get length() {
			return store.size;
		},
		key: (index: number) => [...store.keys()][index] ?? null,
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => {
			store.set(key, value);
		},
		removeItem: vi.fn((key: string) => {
			store.delete(key);
		}),
		clear: () => store.clear(),
	} as unknown as Storage;
}

describe('matchesPattern', () => {
	it('matches an exact name', () => {
		expect(matchesPattern('_fbq', '_fbq')).toBe(true);
	});

	it('does not match a different exact name', () => {
		expect(matchesPattern('_fbq2', '_fbq')).toBe(false);
	});

	it('matches a prefix wildcard pattern', () => {
		expect(matchesPattern('_ga_ABCDEF1234', '_ga_*')).toBe(true);
	});

	it('does not match names outside the wildcard prefix', () => {
		expect(matchesPattern('_gid', '_ga_*')).toBe(false);
	});
});

describe('clearTargetsForCategory', () => {
	let originalLocalStorage: Storage;
	let originalSessionStorage: Storage | undefined;

	beforeEach(() => {
		originalLocalStorage = window.localStorage;
		originalSessionStorage = (window as unknown as { sessionStorage?: Storage })
			.sessionStorage;
		document.cookie = '';
		vi.clearAllMocks();
		getRootDomainMock.mockReturnValue('');
	});

	afterEach(() => {
		window.localStorage = originalLocalStorage;
		(window as unknown as { sessionStorage?: Storage }).sessionStorage =
			originalSessionStorage;
		document.cookie = '';
	});

	it('deletes an exact-name cookie without needing it to exist first', () => {
		clearTargetsForCategory({ cookies: ['_fbq'] });

		expect(deleteCookieMock).toHaveBeenCalledTimes(1);
		expect(deleteCookieMock).toHaveBeenCalledWith('_fbq');
	});

	it('deletes only cookies matching a wildcard pattern', () => {
		document.cookie = '_ga_ABC123=1; _gid=2; other=3';

		clearTargetsForCategory({ cookies: ['_ga_*'] });

		expect(deleteCookieMock).toHaveBeenCalledTimes(1);
		expect(deleteCookieMock).toHaveBeenCalledWith('_ga_ABC123');
	});

	it('deletes a cookie with a configured non-default path', () => {
		clearTargetsForCategory({
			cookies: [{ name: 'checkout_session', path: '/checkout' }],
		});

		expect(deleteCookieMock).toHaveBeenCalledTimes(1);
		expect(deleteCookieMock).toHaveBeenCalledWith('checkout_session', {
			path: '/checkout',
		});
	});

	it('applies the configured path when also retrying against the root domain', () => {
		getRootDomainMock.mockReturnValue('.example.com');

		clearTargetsForCategory({
			cookies: [{ name: 'checkout_session', path: '/checkout' }],
		});

		expect(deleteCookieMock).toHaveBeenCalledTimes(2);
		expect(deleteCookieMock).toHaveBeenCalledWith('checkout_session', {
			path: '/checkout',
		});
		expect(deleteCookieMock).toHaveBeenCalledWith('checkout_session', {
			path: '/checkout',
			domain: '.example.com',
		});
	});

	it('also retries deletion against the root domain for domain-scoped cookies', () => {
		getRootDomainMock.mockReturnValue('.example.com');

		clearTargetsForCategory({ cookies: ['_ga'] });

		expect(deleteCookieMock).toHaveBeenCalledTimes(2);
		expect(deleteCookieMock).toHaveBeenCalledWith('_ga');
		expect(deleteCookieMock).toHaveBeenCalledWith('_ga', {
			domain: '.example.com',
		});
	});

	it('removes an exact-name localStorage key', () => {
		const storage = createFakeStorage();
		window.localStorage = storage;

		clearTargetsForCategory({ localStorage: ['foobar'] });

		expect(storage.removeItem).toHaveBeenCalledWith('foobar');
	});

	it('removes only localStorage keys matching a wildcard pattern', () => {
		const storage = createFakeStorage({
			'ga_disable_UA-1': '1',
			keep: '2',
		});
		window.localStorage = storage;

		clearTargetsForCategory({ localStorage: ['ga_disable_*'] });

		expect(storage.removeItem).toHaveBeenCalledWith('ga_disable_UA-1');
		expect(storage.removeItem).not.toHaveBeenCalledWith('keep');
	});

	it('removes configured sessionStorage keys', () => {
		const storage = createFakeStorage({ temp: '1' });
		(window as unknown as { sessionStorage?: Storage }).sessionStorage =
			storage;

		clearTargetsForCategory({ sessionStorage: ['temp'] });

		expect(storage.removeItem).toHaveBeenCalledWith('temp');
	});

	it('does nothing when no targets are configured', () => {
		clearTargetsForCategory({});

		expect(deleteCookieMock).not.toHaveBeenCalled();
	});
});

describe('runClearOnRevocation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('clears targets only for denied categories present in config', () => {
		const config: ClearOnRevocationConfig = {
			marketing: { cookies: ['_fbq'] },
			measurement: { cookies: ['_ga'] },
		};

		runClearOnRevocation(config, ['marketing']);

		expect(deleteCookieMock).toHaveBeenCalledTimes(1);
		expect(deleteCookieMock).toHaveBeenCalledWith('_fbq');
	});

	it('does nothing when config is undefined', () => {
		runClearOnRevocation(undefined, ['marketing']);

		expect(deleteCookieMock).not.toHaveBeenCalled();
	});

	it('does nothing when a denied category has no matching config entry', () => {
		const config: ClearOnRevocationConfig = {
			marketing: { cookies: ['_fbq'] },
		};

		runClearOnRevocation(config, ['functionality']);

		expect(deleteCookieMock).not.toHaveBeenCalled();
	});
});
