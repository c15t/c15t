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

	test('sets light theme correctly', () => {
		renderHook(() => useColorScheme('light'));
		expect(document.documentElement.classList.contains('c15t-dark')).toBe(
			false
		);
	});

	test('sets dark theme correctly', () => {
		renderHook(() => useColorScheme('dark'));
		expect(document.documentElement.classList.contains('c15t-dark')).toBe(true);
	});

	test('responds to system preference', () => {
		mediaQueryList.matches = true;
		renderHook(() => useColorScheme('system'));
		expect(document.documentElement.classList.contains('c15t-dark')).toBe(true);
		expect(addEventListenerSpy).toHaveBeenCalledWith(
			'change',
			expect.any(Function)
		);
	});

	test('cleans up system preference listener on unmount', () => {
		const { unmount } = renderHook(() => useColorScheme('system'));
		unmount();
		expect(removeEventListenerSpy).toHaveBeenCalled();
	});

	test('updates theme when system preference changes', () => {
		renderHook(() => useColorScheme('system'));

		const calls = addEventListenerSpy.mock.calls;
		const callback = calls[0]?.[1];
		if (!callback) throw new Error('Callback not found');

		(callback as (e: MediaQueryListEvent) => void)({
			matches: true,
		} as MediaQueryListEvent);

		expect(document.documentElement.classList.contains('c15t-dark')).toBe(true);
	});

	test('handles default theme based on document class', () => {
		document.documentElement.classList.add('dark');
		renderHook(() => useColorScheme(null));
		expect(document.documentElement.classList.contains('c15t-dark')).toBe(true);
	});

	test('updates theme when default theme changes', async () => {
		renderHook(() => useColorScheme(null));

		// Simulate class change
		document.documentElement.classList.add('dark');

		// Wait for MutationObserver to process
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(document.documentElement.classList.contains('c15t-dark')).toBe(true);
	});
});
