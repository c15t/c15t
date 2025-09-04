import { defaultTranslationConfig } from 'c15t';
import { describe, expect, test, vi } from 'vitest';
import { ConsentManagerProvider } from '~/providers/consent-manager-provider';
import { renderHook } from '~/tests/render-hook';
import { useConsentManager } from '../use-consent-manager';

// Mock the c15t package
vi.mock('c15t', async () => {
	const originalModule = await vi.importActual('c15t');

	return {
		...(originalModule as object),
		configureConsentManager: () => ({
			getCallbacks: () => ({}),
			setCallbacks: () => ({}),
			showConsentBanner: async () => ({
				ok: true,
				data: {
					showConsentBanner: true,
					jurisdiction: { code: 'GDPR' },
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
		}),
	};
});

describe('useConsentManager', () => {
	test('returns consent state and methods when used within provider', async () => {
		const { result } = await renderHook(() => useConsentManager(), {
			wrapper: ({ children }) => (
				<ConsentManagerProvider
					options={{
						mode: 'offline',
						ui: {
							noStyle: false,
						},
					}}
				>
					{children}
				</ConsentManagerProvider>
			),
		});

		expect(result.current).toBeDefined();
		expect(typeof result.current.showPopup).toBe('boolean');
	});

	test('provides manager object when configured', async () => {
		const { result } = await renderHook(() => useConsentManager(), {
			wrapper: ({ children }) => (
				<ConsentManagerProvider
					options={{
						mode: 'offline',
						ui: {
							noStyle: false,
						},
					}}
				>
					{children}
				</ConsentManagerProvider>
			),
		});

		expect(result.current.manager).toBeDefined();
	});
});
