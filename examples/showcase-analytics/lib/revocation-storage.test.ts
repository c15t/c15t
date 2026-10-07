import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	consumeRevocationNotice,
	rememberRevocation,
} from './revocation-storage';

const storageKey = 'northwind:consent-revoked';

const unavailableStorage = () => {
	throw new DOMException('Storage is blocked', 'SecurityError');
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('revocation notice storage', () => {
	it('remembers a revocation and consumes the notice once', () => {
		const records = new Map<string, string>();
		vi.stubGlobal('sessionStorage', {
			getItem: (key: string) => records.get(key) ?? null,
			removeItem: (key: string) => records.delete(key),
			setItem: (key: string, value: string) => records.set(key, value),
		});

		rememberRevocation();

		expect(records.get(storageKey)).toBe('1');
		expect(consumeRevocationNotice()).toBe(true);
		expect(consumeRevocationNotice()).toBe(false);
	});

	it('treats blocked storage access as no notice', () => {
		vi.stubGlobal('sessionStorage', undefined);
		Object.defineProperty(globalThis, 'sessionStorage', {
			configurable: true,
			get: unavailableStorage,
		});

		expect(consumeRevocationNotice()).toBe(false);
	});

	it('does not interrupt the revocation callback when storage is blocked', () => {
		vi.stubGlobal('sessionStorage', undefined);
		Object.defineProperty(globalThis, 'sessionStorage', {
			configurable: true,
			get: unavailableStorage,
		});

		expect(rememberRevocation).not.toThrow();
	});

	it('treats a failed read as no notice', () => {
		vi.stubGlobal('sessionStorage', {
			getItem: unavailableStorage,
			removeItem: vi.fn(),
		});

		expect(consumeRevocationNotice()).toBe(false);
	});

	it('treats a failed removal as no notice', () => {
		vi.stubGlobal('sessionStorage', {
			getItem: () => '1',
			removeItem: unavailableStorage,
		});

		expect(consumeRevocationNotice()).toBe(false);
	});

	it('does not interrupt the revocation callback when a write fails', () => {
		vi.stubGlobal('sessionStorage', { setItem: unavailableStorage });

		expect(rememberRevocation).not.toThrow();
	});
});
