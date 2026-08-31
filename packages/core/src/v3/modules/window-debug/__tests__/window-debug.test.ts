/**
 * Tests for c15t/v3/modules/window-debug.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';

import { version } from '../../../../version';
import { createWindowDebug, resolveWindowDebugMode } from '../index';

type WindowWithC15t = Window & {
	c15t?: {
		version: string;
		pkg: string;
		mode: string;
	};
};

afterEach(() => {
	if (typeof window !== 'undefined') {
		delete (window as WindowWithC15t).c15t;
	}
});

describe('resolveWindowDebugMode', () => {
	test('maps provider options to the reported transport kind', () => {
		expect(resolveWindowDebugMode({})).toBe('offline');
		expect(resolveWindowDebugMode({ backendURL: '/api/c15t' })).toBe('hosted');
		expect(resolveWindowDebugMode({ mode: 'hosted' })).toBe('hosted');
		expect(resolveWindowDebugMode({ mode: 'c15t' })).toBe('hosted');
		expect(
			resolveWindowDebugMode({ backendURL: '/api/c15t', mode: 'offline' })
		).toBe('offline');
		expect(resolveWindowDebugMode({ transport: {} })).toBe('custom');
		expect(
			resolveWindowDebugMode({ endpointHandlers: {}, mode: 'custom' })
		).toBe('custom');
		// `mode: 'custom'` without handlers falls back to the offline transport.
		expect(resolveWindowDebugMode({ mode: 'custom' })).toBe('offline');
	});
});

describe('window-debug', () => {
	test('installs a frozen window.c15t object with static metadata', () => {
		const handle = createWindowDebug({
			mode: 'hosted',
			pkg: '@c15t/react',
		});

		const debug = (window as WindowWithC15t).c15t;
		expect(debug).toBeTruthy();
		expect(debug).toEqual({
			mode: 'hosted',
			pkg: '@c15t/react',
			version,
		});
		expect(Object.isFrozen(debug)).toBe(true);

		handle.dispose();
	});

	test('dispose removes the installed object', () => {
		const handle = createWindowDebug({
			mode: 'offline',
			pkg: '@c15t/svelte',
		});

		expect((window as WindowWithC15t).c15t).toBeTruthy();
		handle.dispose();
		expect((window as WindowWithC15t).c15t).toBeUndefined();
	});

	test('dispose does not remove a newer install', () => {
		const first = createWindowDebug({
			mode: 'hosted',
			pkg: '@c15t/react',
		});
		const second = createWindowDebug({
			mode: 'hosted',
			pkg: '@c15t/nextjs',
		});
		const latest = (window as WindowWithC15t).c15t;

		first.dispose();

		expect((window as WindowWithC15t).c15t).toBe(latest);
		expect((window as WindowWithC15t).c15t?.pkg).toBe('@c15t/nextjs');

		second.dispose();
	});

	test('degrades to an inert handle when window.c15t is non-writable', () => {
		Object.defineProperty(window, 'c15t', {
			configurable: true,
			value: 'host-owned',
			writable: false,
		});

		try {
			let handle: { dispose: () => void } | undefined;
			expect(() => {
				handle = createWindowDebug({ mode: 'hosted', pkg: '@c15t/vue' });
			}).not.toThrow();
			expect((window as WindowWithC15t).c15t).toBe('host-owned');
			expect(() => handle?.dispose()).not.toThrow();
			expect((window as WindowWithC15t).c15t).toBe('host-owned');
		} finally {
			Object.defineProperty(window, 'c15t', {
				configurable: true,
				value: undefined,
				writable: true,
			});
			delete (window as WindowWithC15t).c15t;
		}
	});

	test('returns an inert handle when window is undefined', () => {
		const previousWindow = (
			globalThis as typeof globalThis & { window?: Window }
		).window;
		vi.stubGlobal('window', undefined);
		try {
			const handle = createWindowDebug({
				mode: 'offline',
				pkg: '@c15t/react',
			});

			expect(() => handle.dispose()).not.toThrow();
		} finally {
			vi.stubGlobal('window', previousWindow);
		}
	});
});
