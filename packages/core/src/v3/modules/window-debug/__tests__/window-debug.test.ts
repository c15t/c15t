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
			resolveWindowDebugMode({ mode: 'offline', backendURL: '/api/c15t' })
		).toBe('offline');
		expect(resolveWindowDebugMode({ transport: {} })).toBe('custom');
		expect(
			resolveWindowDebugMode({ mode: 'custom', endpointHandlers: {} })
		).toBe('custom');
		// `mode: 'custom'` without handlers falls back to the offline transport.
		expect(resolveWindowDebugMode({ mode: 'custom' })).toBe('offline');
	});
});

describe('window-debug', () => {
	test('installs a frozen window.c15t object with static metadata', () => {
		const handle = createWindowDebug({
			pkg: '@c15t/react',
			mode: 'hosted',
		});

		const debug = (window as WindowWithC15t).c15t;
		expect(debug).toBeTruthy();
		expect(debug).toEqual({
			version,
			pkg: '@c15t/react',
			mode: 'hosted',
		});
		expect(Object.isFrozen(debug)).toBe(true);

		handle.dispose();
	});

	test('dispose removes the installed object', () => {
		const handle = createWindowDebug({
			pkg: '@c15t/svelte',
			mode: 'offline',
		});

		expect((window as WindowWithC15t).c15t).toBeTruthy();
		handle.dispose();
		expect((window as WindowWithC15t).c15t).toBeUndefined();
	});

	test('dispose does not remove a newer install', () => {
		const first = createWindowDebug({
			pkg: '@c15t/react',
			mode: 'hosted',
		});
		const second = createWindowDebug({
			pkg: '@c15t/nextjs',
			mode: 'hosted',
		});
		const latest = (window as WindowWithC15t).c15t;

		first.dispose();

		expect((window as WindowWithC15t).c15t).toBe(latest);
		expect((window as WindowWithC15t).c15t?.pkg).toBe('@c15t/nextjs');

		second.dispose();
	});

	test('degrades to an inert handle when window.c15t is non-writable', () => {
		Object.defineProperty(window, 'c15t', {
			value: 'host-owned',
			writable: false,
			configurable: true,
		});

		try {
			let handle: { dispose(): void } | undefined;
			expect(() => {
				handle = createWindowDebug({ pkg: '@c15t/vue', mode: 'hosted' });
			}).not.toThrow();
			expect((window as WindowWithC15t).c15t).toBe('host-owned');
			expect(() => handle?.dispose()).not.toThrow();
			expect((window as WindowWithC15t).c15t).toBe('host-owned');
		} finally {
			Object.defineProperty(window, 'c15t', {
				value: undefined,
				writable: true,
				configurable: true,
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
				pkg: '@c15t/react',
				mode: 'offline',
			});

			expect(() => handle.dispose()).not.toThrow();
		} finally {
			vi.stubGlobal('window', previousWindow);
		}
	});
});
