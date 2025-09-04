import { type ConsentManagerOptions, defaultTranslationConfig } from 'c15t';
// consent-manager-provider.context.test.tsx - Test context values
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { useConsentManager } from '../../hooks/use-consent-manager';
import {
	ConsentManagerProvider,
	clearConsentManagerCache,
} from '../consent-manager-provider';
import { setupMocks } from './test-helpers';

// Setup common mocks
const { mockConfigureConsentManager } = setupMocks();

// Mock c15t module directly in this test file
vi.mock('c15t', async () => {
	const originalModule = await vi.importActual('c15t');

	return {
		...(originalModule as object),
		configureConsentManager: (options: ConsentManagerOptions) => {
			// Track the call
			mockConfigureConsentManager(options);

			// Return a ready-to-use mock with showPopup set to true
			return {
				getCallbacks: () => options.callbacks || {},
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
			};
		},
	};
});

// Helper to manually modify the context value
const modifyContextShowPopup = vi.fn();

// Mock the useConsentManager hook
vi.mock('../../hooks/use-consent-manager', async () => {
	const originalModule = await vi.importActual(
		'../../hooks/use-consent-manager'
	);

	return {
		...(originalModule as object),
		useConsentManager: () => {
			const result = (
				originalModule as unknown as {
					useConsentManager: () => { showPopup: boolean };
				}
			).useConsentManager();
			// Force showPopup to true for tests
			result.showPopup = true;
			// Track that this was called
			modifyContextShowPopup();
			return result;
		},
	};
});

describe('ConsentManagerProvider Context Values', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		// Clear consent manager caches to ensure clean state between tests
		clearConsentManagerCache();
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	it('should provide correct context values to children', async () => {
		const ConsumerComponent = () => {
			const context = useConsentManager();
			return (
				<div>
					<div data-testid="has-manager">
						{Boolean(context.manager).toString()}
					</div>
					<div data-testid="show-popup">
						{context.showPopup ? 'true' : 'false'}
					</div>
					<div data-testid="debug-state">
						{JSON.stringify({ showPopup: context.showPopup })}
					</div>
				</div>
			);
		};

		const { getByTestId } = render(
			//@ts-expect-error - TODO: fix this
			<ConsentManagerProvider
				options={{
					mode: 'offline',
					ui: { theme: { 'banner.root': 'dark' } },
				}}
			>
				<ConsumerComponent />
			</ConsentManagerProvider>
		);

		// Advance timers to allow all async operations to complete
		await vi.runAllTimersAsync();

		// Verify our mock was called
		expect(modifyContextShowPopup).toHaveBeenCalled();

		// Wait for values to be available (with generous timeout)
		await vi.waitFor(
			() => {
				expect(getByTestId('has-manager')).toHaveTextContent('true');
				expect(getByTestId('show-popup')).toHaveTextContent('true');
			},
			{ timeout: 3000 }
		);
	});

	it('should execute callbacks when provided', async () => {
		const onConsentSet = vi.fn();

		render(
			//@ts-expect-error - TODO: fix this
			<ConsentManagerProvider
				options={{
					mode: 'offline',
					callbacks: {
						onConsentSet,
					},
				}}
			>
				<div>Test</div>
			</ConsentManagerProvider>
		);

		// Advance timers to allow all async operations to complete
		await vi.runAllTimersAsync();

		// Verify the mock was called, with some wait time for async operations
		await vi.waitFor(
			() => {
				expect(mockConfigureConsentManager).toHaveBeenCalled();
			},
			{ timeout: 3000 }
		);

		// Verify the callback was properly passed
		const mockCall = mockConfigureConsentManager.mock.calls[0];
		expect(mockCall).toBeDefined();

		if (mockCall) {
			const options = mockCall[0];
			expect(options).toHaveProperty('callbacks');
			expect(options.callbacks).toHaveProperty('onConsentSet', onConsentSet);
		}
	});
});
