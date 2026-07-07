/**
 * Tests for c15t/v3/modules/window-debug.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { version } from '../../../../version';
import { createWindowDebug } from '../index';

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
