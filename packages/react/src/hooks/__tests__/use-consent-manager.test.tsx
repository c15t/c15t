import { defaultTranslationConfig } from 'c15t';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import {
	ConsentManagerProvider,
	clearConsentRuntimeCache,
} from '~/providers/consent-manager-provider';
import { useConsentManager } from '../use-consent-manager';

// Mock the c15t package
vi.mock('c15t', async () => {
	const originalModule = await vi.importActual('c15t');
	const { createConsentManagerStore } = originalModule as typeof import('c15t');

	const createMockConsentManager = () => ({
		getCallbacks: () => ({}),
		setCallbacks: () => ({}),
		showConsentBanner: async () => ({
			ok: true,
			data: {
				showConsentBanner: true,
				jurisdiction: {
					code: 'GDPR',
				},
				translations: {
					language: 'en',
					translations: defaultTranslationConfig.translations.en,
				},
			},
			error: null,
			response: null,
		}),
		setConsent: async () => ({
			ok: true,
			data: { success: true },
			error: null,
			response: null,
		}),
		verifyConsent: async () => ({
			ok: true,
			data: { valid: true },
			error: null,
			response: null,
		}),
	});

	return {
		...(originalModule as object),
		configureConsentManager: createMockConsentManager,
		getOrCreateConsentRuntime: (
			options: {
				mode?: string;
				store?: Record<string, unknown>;
				translations?: unknown;
				consentCategories?: string[];
			},
			pkgInfo: { pkg: string; version: string }
		) => {
			const consentManager = createMockConsentManager();
			const consentStore = createConsentManagerStore(consentManager, {
				config: {
					pkg: pkgInfo.pkg,
					version: pkgInfo.version,
					mode: options.mode || 'Unknown',
				},
				...options,
				...options.store,
				initialConsentCategories: options.consentCategories,
				initialTranslationConfig: options.translations,
			});

			return {
				consentManager,
				consentStore,
				cacheKey: `test:${options.mode || 'c15t'}:${Date.now()}`,
			};
		},
	};
});

describe('useConsentManager', () => {
	beforeEach(() => {
		clearConsentRuntimeCache();
		// Clear cookies and localStorage
		window.localStorage.clear();
		const cookies = document.cookie.split(';');
		for (const cookie of cookies) {
			const name = cookie.split('=')[0]?.trim();
			if (name) {
				document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
			}
		}
	});

	test('returns consent state and methods when used within provider', async () => {
		const { result } = await renderHook(() => useConsentManager(), {
			wrapper: ({ children }) => (
				<ConsentManagerProvider
					options={{
						mode: 'offline',
						noStyle: false,
					}}
				>
					{children}
				</ConsentManagerProvider>
			),
		});

		expect(result.current).toBeDefined();
		expect(typeof result.current.activeUI).toBe('string');
	});

	test('provides manager object when configured', async () => {
		const { result } = await renderHook(() => useConsentManager(), {
			wrapper: ({ children }) => (
				<ConsentManagerProvider
					options={{
						mode: 'offline',
						noStyle: false,
					}}
				>
					{children}
				</ConsentManagerProvider>
			),
		});

		expect(result.current.manager).toBeDefined();
	});
});
