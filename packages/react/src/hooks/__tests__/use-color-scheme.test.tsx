import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import { useColorScheme } from '../use-color-scheme';

describe('useColorScheme', () => {
	let mediaQueryList: {
		matches: boolean;
		addEventListener: ReturnType<typeof vi.fn>;
		removeEventListener: ReturnType<typeof vi.fn>;
		addListener: ReturnType<typeof vi.fn>;
		removeListener: ReturnType<typeof vi.fn>;
		dispatchEvent: ReturnType<typeof vi.fn>;
		onchange: null;
		media: string;
	};
	let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
	let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		// Reset document classes
		document.documentElement.classList.remove('c15t-dark', 'dark');

		// Mock matchMedia
		mediaQueryList = {
			matches: false,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(), // Deprecated but included for completeness
			removeListener: vi.fn(), // Deprecated but included for completeness
			dispatchEvent: vi.fn(),
			onchange: null,
			media: '(prefers-color-scheme: dark)',
		};

		vi.spyOn(window, 'matchMedia').mockImplementation(
			() => mediaQueryList as MediaQueryList
		);

		// Spy on event listeners
		addEventListenerSpy = vi.spyOn(mediaQueryList, 'addEventListener');
		removeEventListenerSpy = vi.spyOn(mediaQueryList, 'removeEventListener');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('sets light theme correctly', async () => {
		await renderHook(() => useColorScheme('light'));
		expect(document.documentElement.classList.contains('c15t-dark')).toBe(
			false
		);
	});

	test('sets dark theme correctly', async () => {
		await renderHook(() => useColorScheme('dark'));
		expect(document.documentElement.classList.contains('c15t-dark')).toBe(true);
	});

	test('responds to system preference', async () => {
		mediaQueryList.matches = true;
		await renderHook(() => useColorScheme('system'));
		expect(document.documentElement.classList.contains('c15t-dark')).toBe(true);
		expect(addEventListenerSpy).toHaveBeenCalledWith(
			'change',
			expect.any(Function)
		);
	});

	test('cleans up system preference listener on unmount', async () => {
		const { unmount } = await renderHook(() => useColorScheme('system'));
		unmount();
		expect(removeEventListenerSpy).toHaveBeenCalled();
	});

	test('updates theme when system preference changes', async () => {
		await renderHook(() => useColorScheme('system'));

		const calls = addEventListenerSpy.mock.calls;
		const callback = calls[0]?.[1];
		if (!callback) throw new Error('Callback not found');

		(callback as (e: MediaQueryListEvent) => void)({
			matches: true,
		} as MediaQueryListEvent);

		expect(document.documentElement.classList.contains('c15t-dark')).toBe(true);
	});

	test('does nothing when colorScheme is null (opt-out behavior)', async () => {
		// When colorScheme is null, the hook opts out and does nothing
		// This allows users to manage color scheme themselves
		document.documentElement.classList.add('dark');
		await renderHook(() => useColorScheme(null));
		// c15t-dark should NOT be added - the hook is inactive when null
		expect(document.documentElement.classList.contains('c15t-dark')).toBe(
			false
		);
		// The original 'dark' class should still be there (untouched)
		expect(document.documentElement.classList.contains('dark')).toBe(true);
	});
});
