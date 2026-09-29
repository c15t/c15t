import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
	clearConsentRuntimeCache,
	getOrCreateConsentRuntime,
} from '../../../runtime';
import type { FetcherContext } from '../fetcher';
import { C15tClient } from '../index';
import {
	checkPendingConsentSubmissions,
	checkPendingIdentifySubmissions,
} from '../pending-submissions';

const context: FetcherContext = {
	backendURL: '/api/c15t',
	headers: {},
	corsMode: 'cors',
	retryConfig: { maxRetries: 0 },
};
const originalWindow = window;
const originalDocument = document;
const originalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');

beforeEach(() => {
	vi.useFakeTimers();
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	vi.clearAllTimers();
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.stubGlobal('window', originalWindow);
	vi.stubGlobal('document', originalDocument);
	if (originalStorage)
		Object.defineProperty(window, 'localStorage', originalStorage);
	clearConsentRuntimeCache();
});

const checks = [
	{
		name: 'consent',
		check: checkPendingConsentSubmissions,
		key: 'c15t-pending-consent-submissions',
	},
	{
		name: 'identify',
		check: checkPendingIdentifySubmissions,
		key: 'c15t-pending-identify-submissions',
	},
];

for (const { name, check, key } of checks) {
	describe(`${name} queue storage`, () => {
		test('catches a throwing getter and reports the unavailable queue', () => {
			Object.defineProperty(window, 'localStorage', {
				configurable: true,
				get() {
					throw new DOMException('Storage access blocked', 'SecurityError');
				},
			});
			const replay = vi.fn();
			expect(() => check(context, replay)).not.toThrow();
			expect(console.warn).toHaveBeenCalled();
			vi.runAllTimers();
			expect(replay).not.toHaveBeenCalled();
		});

		test.each([
			'getItem',
			'setItem',
			'removeItem',
		] as const)('handles throwing %s', (method) => {
			const storage = {
				getItem: vi.fn(() => '[]'),
				setItem: vi.fn(),
				removeItem: vi.fn(),
			};
			storage[method].mockImplementation(() => {
				throw new Error('Storage unavailable');
			});
			Object.defineProperty(window, 'localStorage', {
				configurable: true,
				value: storage,
			});
			expect(() => check(context, vi.fn())).not.toThrow();
		});

		test('replays an ordinary persisted queue', () => {
			const submissions = [
				{ subjectId: 'sub_saved', externalId: 'user_saved' },
			];
			const storage = {
				getItem: vi.fn((storedKey: string) =>
					storedKey === key ? JSON.stringify(submissions) : null
				),
				setItem: vi.fn(),
				removeItem: vi.fn(),
			};
			Object.defineProperty(window, 'localStorage', {
				configurable: true,
				value: storage,
			});
			const replay = vi.fn();
			check(context, replay);
			vi.runAllTimers();
			expect(replay).toHaveBeenCalledExactlyOnceWith(submissions);
		});

		test('skips queue access during SSR', () => {
			vi.stubGlobal('window', undefined);
			const replay = vi.fn();
			expect(() => check(context, replay)).not.toThrow();
			vi.runAllTimers();
			expect(replay).not.toHaveBeenCalled();
		});
	});
}

test('constructs the hosted client and runtime during SSR with optional consent denied', async () => {
	vi.stubGlobal('window', undefined);
	vi.stubGlobal('document', undefined);
	expect(() => new C15tClient({ backendURL: '/api/c15t' })).not.toThrow();
	const { consentStore } = getOrCreateConsentRuntime({
		mode: 'hosted',
		backendURL: '/api/c15t',
		consentCategories: ['necessary', 'measurement'],
	});
	await expect(
		consentStore.getState().initConsentManager()
	).resolves.toBeUndefined();
	expect(consentStore.getState().has('measurement')).toBe(false);
});
