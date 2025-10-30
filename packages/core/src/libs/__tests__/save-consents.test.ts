import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoreApi } from 'zustand';
import type { ConsentManagerInterface } from '../../client/client-interface';
import type { PrivacyConsentState } from '../../store.type';
import { saveConsents } from '../save-consents';

// Mock the GTM and tracking blocker modules
vi.mock('../gtm', () => ({
	updateGTMConsent: vi.fn(),
}));

vi.mock('../tracking-blocker', () => ({
	createTrackingBlocker: vi.fn(() => ({
		updateConsents: vi.fn(),
	})),
}));

describe('saveConsents', () => {
	let mockManager: ConsentManagerInterface;
	let mockGet: StoreApi<PrivacyConsentState>['getState'];
	let mockSet: StoreApi<PrivacyConsentState>['setState'];
	let mockTrackingBlocker: {
		updateConsents: ReturnType<typeof vi.fn>;
		destroy: ReturnType<typeof vi.fn>;
	} | null;
	let mockLocalStorage: Storage;

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();

		// Mock localStorage
		mockLocalStorage = {
			setItem: vi.fn(),
			getItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
			length: 0,
			key: vi.fn(),
		};

		// Mock window and localStorage globally
		vi.stubGlobal('localStorage', mockLocalStorage);
		vi.stubGlobal('document', {
			cookie: '',
		});
		vi.stubGlobal('window', {
			...globalThis.window,
			localStorage: mockLocalStorage,
			location: {
				hostname: 'test.example.com',
				protocol: 'https:',
			},
		});

		// Create mock manager
		mockManager = {
			setConsent: vi.fn().mockResolvedValue({ ok: true }),
			showConsentBanner: vi.fn(),
			verifyConsent: vi.fn(),
			$fetch: vi.fn(),
		};

		// Create mock store functions
		mockGet = vi.fn().mockReturnValue({
			callbacks: {
				onConsentSet: vi.fn(),
				onError: vi.fn(),
			},
			gdprTypes: [
				'necessary',
				'functionality',
				'measurement',
				'experience',
				'marketing',
			],
			updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
			updateIframeConsents: vi.fn(),
			consents: {
				necessary: true,
				functionality: false,
				measurement: false,
				experience: false,
				marketing: false,
			},
			consentTypes: [
				{
					name: 'necessary',
					defaultValue: true,
					description: 'Necessary cookies',
					disabled: true,
					display: true,
					gdprType: 1,
				},
				{
					name: 'functionality',
					defaultValue: false,
					description: 'Functionality cookies',
					disabled: false,
					display: true,
					gdprType: 2,
				},
				{
					name: 'measurement',
					defaultValue: false,
					description: 'Measurement cookies',
					disabled: false,
					display: true,
					gdprType: 4,
				},
				{
					name: 'experience',
					defaultValue: false,
					description: 'Experience cookies',
					disabled: false,
					display: true,
					gdprType: 3,
				},
				{
					name: 'marketing',
					defaultValue: false,
					description: 'Marketing cookies',
					disabled: false,
					display: true,
					gdprType: 5,
				},
			],
		});

		mockSet = vi.fn();

		mockTrackingBlocker = {
			updateConsents: vi.fn(),
			destroy: vi.fn(),
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('consent type handling', () => {
		it('should set all consents to true when type is "all"', async () => {
			await saveConsents({
				manager: mockManager,
				type: 'all',
				get: mockGet,
				set: mockSet,
				trackingBlocker: mockTrackingBlocker,
			});

			expect(mockSet).toHaveBeenCalledWith({
				consents: {
					necessary: true,
					functionality: true,
					measurement: true,
					experience: true,
					marketing: true,
				},
				selectedConsents: {
					necessary: true,
					functionality: true,
					measurement: true,
					experience: true,
					marketing: true,
				},
				showPopup: false,
				consentInfo: expect.objectContaining({
					type: 'all',
					time: expect.any(Number),
				}),
			});
		});

		it('should set only necessary consent to true when type is "necessary"', async () => {
			await saveConsents({
				manager: mockManager,
				type: 'necessary',
				get: mockGet,
				set: mockSet,
				trackingBlocker: mockTrackingBlocker,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					consents: {
						necessary: true,
						functionality: false,
						measurement: false,
						experience: false,
						marketing: false,
					},
					showPopup: false,
					consentInfo: expect.objectContaining({
						type: 'necessary',
						time: expect.any(Number),
					}),
				})
			);
		});

		it('should preserve existing consents when type is "custom"', async () => {
			const customConsents = {
				necessary: true,
				functionality: true,
				measurement: false,
				experience: true,
				marketing: false,
			};

			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onConsentSet: vi.fn(),
					onError: vi.fn(),
				},
				gdprTypes: [
					'necessary',
					'functionality',
					'measurement',
					'experience',
					'marketing',
				],
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
				updateIframeConsents: vi.fn(),
				consents: customConsents,
				selectedConsents: customConsents,
				consentTypes: [
					{
						name: 'necessary',
						defaultValue: true,
						description: 'Necessary cookies',
						disabled: true,
						display: true,
						gdprType: 1,
					},
					{
						name: 'functionality',
						defaultValue: false,
						description: 'Functionality cookies',
						disabled: false,
						display: true,
						gdprType: 2,
					},
					{
						name: 'measurement',
						defaultValue: false,
						description: 'Measurement cookies',
						disabled: false,
						display: true,
						gdprType: 4,
					},
					{
						name: 'experience',
						defaultValue: false,
						description: 'Experience cookies',
						disabled: false,
						display: true,
						gdprType: 3,
					},
					{
						name: 'marketing',
						defaultValue: false,
						description: 'Marketing cookies',
						disabled: false,
						display: true,
						gdprType: 5,
					},
				],
			});

			await saveConsents({
				manager: mockManager,
				type: 'custom',
				get: mockGet,
				set: mockSet,
				trackingBlocker: mockTrackingBlocker,
			});

			expect(mockSet).toHaveBeenCalledWith({
				consents: customConsents,
				selectedConsents: customConsents,
				showPopup: false,
				consentInfo: expect.objectContaining({
					type: 'custom',
					time: expect.any(Number),
				}),
			});
		});
	});

	describe('state management', () => {
		it('should update state immediately for responsive UI', async () => {
			await saveConsents({
				manager: mockManager,
				type: 'all',
				get: mockGet,
				set: mockSet,
				trackingBlocker: mockTrackingBlocker,
			});

			// Verify state was updated with new consents
			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					consents: expect.objectContaining({
						necessary: true,
						functionality: true,
						measurement: true,
						experience: true,
						marketing: true,
					}),
					showPopup: false,
					consentInfo: expect.objectContaining({
						type: 'all',
						time: expect.any(Number),
					}),
				})
			);
		});
	});

	describe('tracking blocker integration', () => {
		it('should update tracking blocker with new consents', async () => {
			await saveConsents({
				manager: mockManager,
				type: 'all',
				get: mockGet,
				set: mockSet,
				trackingBlocker: mockTrackingBlocker,
			});

			expect(mockTrackingBlocker?.updateConsents).toHaveBeenCalledWith({
				necessary: true,
				functionality: true,
				measurement: true,
				experience: true,
				marketing: true,
			});
		});

		it('should handle null tracking blocker gracefully', async () => {
			await saveConsents({
				manager: mockManager,
				type: 'all',
				get: mockGet,
				set: mockSet,
				trackingBlocker: null,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					consents: {
						necessary: true,
						functionality: true,
						measurement: true,
						experience: true,
						marketing: true,
					},
					showPopup: false,
					consentInfo: expect.objectContaining({
						type: 'all',
						time: expect.any(Number),
					}),
				})
			);
		});
	});

	describe('callback execution', () => {
		it('should call onConsentSet callback with preferences', async () => {
			const mockOnConsentSet = vi.fn();
			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onConsentSet: mockOnConsentSet,
					onError: vi.fn(),
				},
				gdprTypes: [
					'necessary',
					'functionality',
					'measurement',
					'experience',
					'marketing',
				],
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
				updateIframeConsents: vi.fn(),
				consents: {
					necessary: true,
					functionality: false,
					measurement: false,
					experience: false,
					marketing: false,
				},
				selectedConsents: {
					necessary: true,
					functionality: false,
					measurement: false,
					experience: false,
					marketing: false,
				},
				consentTypes: [
					{
						name: 'necessary',
						defaultValue: true,
						description: 'Necessary cookies',
						disabled: true,
						display: true,
						gdprType: 1,
					},
					{
						name: 'functionality',
						defaultValue: false,
						description: 'Functionality cookies',
						disabled: false,
						display: true,
						gdprType: 2,
					},
					{
						name: 'measurement',
						defaultValue: false,
						description: 'Measurement cookies',
						disabled: false,
						display: true,
						gdprType: 4,
					},
					{
						name: 'experience',
						defaultValue: false,
						description: 'Experience cookies',
						disabled: false,
						display: true,
						gdprType: 3,
					},
					{
						name: 'marketing',
						defaultValue: false,
						description: 'Marketing cookies',
						disabled: false,
						display: true,
						gdprType: 5,
					},
				],
			});

			await saveConsents({
				manager: mockManager,
				type: 'necessary',
				get: mockGet,
				set: mockSet,
				trackingBlocker: mockTrackingBlocker,
			});

			expect(mockOnConsentSet).toHaveBeenCalledWith({
				preferences: {
					necessary: true,
					functionality: false,
					measurement: false,
					experience: false,
					marketing: false,
				},
			});
		});

		it('should handle missing onConsentSet callback gracefully', async () => {
			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onConsentSet: undefined,
					onError: vi.fn(),
				},
				gdprTypes: [
					'necessary',
					'functionality',
					'measurement',
					'experience',
					'marketing',
				],
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
				updateIframeConsents: vi.fn(),
				consents: {
					necessary: true,
					functionality: false,
					measurement: false,
					experience: false,
					marketing: false,
				},
				selectedConsents: {
					necessary: true,
					functionality: false,
					measurement: false,
					experience: false,
					marketing: false,
				},
				consentTypes: [
					{
						name: 'necessary',
						defaultValue: true,
						description: 'Necessary cookies',
						disabled: true,
						display: true,
						gdprType: 1,
					},
					{
						name: 'functionality',
						defaultValue: false,
						description: 'Functionality cookies',
						disabled: false,
						display: true,
						gdprType: 2,
					},
					{
						name: 'measurement',
						defaultValue: false,
						description: 'Measurement cookies',
						disabled: false,
						display: true,
						gdprType: 4,
					},
					{
						name: 'experience',
						defaultValue: false,
						description: 'Experience cookies',
						disabled: false,
						display: true,
						gdprType: 3,
					},
					{
						name: 'marketing',
						defaultValue: false,
						description: 'Marketing cookies',
						disabled: false,
						display: true,
						gdprType: 5,
					},
				],
			});

			await expect(
				saveConsents({
					manager: mockManager,
					type: 'necessary',
					get: mockGet,
					set: mockSet,
					trackingBlocker: mockTrackingBlocker,
				})
			).resolves.not.toThrow();
		});
	});

	describe('API integration', () => {
		it('should call manager.setConsent with correct parameters', async () => {
			await saveConsents({
				manager: mockManager,
				type: 'all',
				get: mockGet,
				set: mockSet,
				trackingBlocker: mockTrackingBlocker,
			});

			expect(mockManager.setConsent).toHaveBeenCalledWith({
				body: {
					type: 'cookie_banner',
					domain: 'test.example.com',
					preferences: {
						necessary: true,
						functionality: true,
						measurement: true,
						experience: true,
						marketing: true,
					},
					metadata: {
						source: 'consent_widget',
						acceptanceMethod: 'all',
					},
				},
			});
		});

		it('should handle API success correctly', async () => {
			mockManager.setConsent = vi.fn().mockResolvedValue({ ok: true });

			await saveConsents({
				manager: mockManager,
				type: 'all',
				get: mockGet,
				set: mockSet,
				trackingBlocker: mockTrackingBlocker,
			});

			expect(mockManager.setConsent).toHaveBeenCalled();
		});

		it('should handle API error with onError callback', async () => {
			const mockOnError = vi.fn();
			const errorMessage = 'API request failed';

			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onConsentSet: vi.fn(),
					onError: mockOnError,
				},
				gdprTypes: [
					'necessary',
					'functionality',
					'measurement',
					'experience',
					'marketing',
				],
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
				updateIframeConsents: vi.fn(),
				consents: {
					necessary: true,
					functionality: false,
					measurement: false,
					experience: false,
					marketing: false,
				},
				selectedConsents: {
					necessary: true,
					functionality: false,
					measurement: false,
					experience: false,
					marketing: false,
				},
				consentTypes: [
					{
						name: 'necessary',
						defaultValue: true,
						description: 'Necessary cookies',
						disabled: true,
						display: true,
						gdprType: 1,
					},
					{
						name: 'functionality',
						defaultValue: false,
						description: 'Functionality cookies',
						disabled: false,
						display: true,
						gdprType: 2,
					},
					{
						name: 'measurement',
						defaultValue: false,
						description: 'Measurement cookies',
						disabled: false,
						display: true,
						gdprType: 4,
					},
					{
						name: 'experience',
						defaultValue: false,
						description: 'Experience cookies',
						disabled: false,
						display: true,
						gdprType: 3,
					},
					{
						name: 'marketing',
						defaultValue: false,
						description: 'Marketing cookies',
						disabled: false,
						display: true,
						gdprType: 5,
					},
				],
			});

			mockManager.setConsent = vi.fn().mockResolvedValue({
				ok: false,
				error: { message: errorMessage },
			});

			await saveConsents({
				manager: mockManager,
				type: 'all',
				get: mockGet,
				set: mockSet,
				trackingBlocker: mockTrackingBlocker,
			});

			expect(mockOnError).toHaveBeenCalledWith({
				error: errorMessage,
			});
		});

		it('should handle API error without onError callback and log to console', async () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {});

			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onConsentSet: vi.fn(),
					onError: undefined,
				},
				gdprTypes: [
					'necessary',
					'functionality',
					'measurement',
					'experience',
					'marketing',
				],
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
				updateIframeConsents: vi.fn(),
				consents: {
					necessary: true,
					functionality: false,
					measurement: false,
					experience: false,
					marketing: false,
				},
				selectedConsents: {
					necessary: true,
					functionality: false,
					measurement: false,
					experience: false,
					marketing: false,
				},
				consentTypes: [
					{
						name: 'necessary',
						defaultValue: true,
						description: 'Necessary cookies',
						disabled: true,
						display: true,
						gdprType: 1,
					},
					{
						name: 'functionality',
						defaultValue: false,
						description: 'Functionality cookies',
						disabled: false,
						display: true,
						gdprType: 2,
					},
					{
						name: 'measurement',
						defaultValue: false,
						description: 'Measurement cookies',
						disabled: false,
						display: true,
						gdprType: 4,
					},
					{
						name: 'experience',
						defaultValue: false,
						description: 'Experience cookies',
						disabled: false,
						display: true,
						gdprType: 3,
					},
					{
						name: 'marketing',
						defaultValue: false,
						description: 'Marketing cookies',
						disabled: false,
						display: true,
						gdprType: 5,
					},
				],
			});

			mockManager.setConsent = vi.fn().mockResolvedValue({
				ok: false,
				error: { message: 'API request failed' },
			});

			await saveConsents({
				manager: mockManager,
				type: 'all',
				get: mockGet,
				set: mockSet,
				trackingBlocker: mockTrackingBlocker,
			});

			expect(consoleErrorSpy).toHaveBeenCalledWith('API request failed');

			consoleErrorSpy.mockRestore();
		});

		it('should handle API error with fallback error message', async () => {
			const mockOnError = vi.fn();

			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onConsentSet: vi.fn(),
					onError: mockOnError,
				},
				gdprTypes: [
					'necessary',
					'functionality',
					'measurement',
					'experience',
					'marketing',
				],
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
				updateIframeConsents: vi.fn(),
				consents: {
					necessary: true,
					functionality: false,
					measurement: false,
					experience: false,
					marketing: false,
				},
				selectedConsents: {
					necessary: true,
					functionality: false,
					measurement: false,
					experience: false,
					marketing: false,
				},
				consentTypes: [
					{
						name: 'necessary',
						defaultValue: true,
						description: 'Necessary cookies',
						disabled: true,
						display: true,
						gdprType: 1,
					},
					{
						name: 'functionality',
						defaultValue: false,
						description: 'Functionality cookies',
						disabled: false,
						display: true,
						gdprType: 2,
					},
					{
						name: 'measurement',
						defaultValue: false,
						description: 'Measurement cookies',
						disabled: false,
						display: true,
						gdprType: 4,
					},
					{
						name: 'experience',
						defaultValue: false,
						description: 'Experience cookies',
						disabled: false,
						display: true,
						gdprType: 3,
					},
					{
						name: 'marketing',
						defaultValue: false,
						description: 'Marketing cookies',
						disabled: false,
						display: true,
						gdprType: 5,
					},
				],
			});

			mockManager.setConsent = vi.fn().mockResolvedValue({
				ok: false,
				error: undefined,
			});

			await saveConsents({
				manager: mockManager,
				type: 'all',
				get: mockGet,
				set: mockSet,
				trackingBlocker: mockTrackingBlocker,
			});

			expect(mockOnError).toHaveBeenCalledWith({
				error: 'Failed to save consents',
			});
		});
	});

	describe('GTM integration', () => {
		it('should call updateGTMConsent with new consents', async () => {
			const { updateGTMConsent } = await import('../gtm');

			await saveConsents({
				manager: mockManager,
				type: 'all',
				get: mockGet,
				set: mockSet,
				trackingBlocker: mockTrackingBlocker,
			});

			expect(updateGTMConsent).toHaveBeenCalledWith({
				necessary: true,
				functionality: true,
				measurement: true,
				experience: true,
				marketing: true,
			});
		});
	});

	describe('scheduling/yield behavior', () => {
		it('defers tracking/GTM updates and onConsentSet to the next task', async () => {
			vi.useFakeTimers();
			try {
				const onConsentSet = vi.fn();
				// Override get() to inject our spy for this test
				mockGet = vi.fn().mockReturnValue({
					callbacks: {
						onConsentSet,
						onError: vi.fn(),
					},
					gdprTypes: [
						'necessary',
						'functionality',
						'measurement',
						'experience',
						'marketing',
					],
					updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
					updateIframeConsents: vi.fn(),
					consents: {
						necessary: true,
						functionality: false,
						measurement: false,
						experience: false,
						marketing: false,
					},
					consentTypes: [
						{
							name: 'necessary',
							defaultValue: true,
							description: 'Necessary',
							disabled: true,
							display: true,
							gdprType: 1,
						},
						{
							name: 'functionality',
							defaultValue: false,
							description: 'Functionality',
							disabled: false,
							display: true,
							gdprType: 2,
						},
						{
							name: 'measurement',
							defaultValue: false,
							description: 'Measurement',
							disabled: false,
							display: true,
							gdprType: 4,
						},
						{
							name: 'experience',
							defaultValue: false,
							description: 'Experience',
							disabled: false,
							display: true,
							gdprType: 3,
						},
						{
							name: 'marketing',
							defaultValue: false,
							description: 'Marketing',
							disabled: false,
							display: true,
							gdprType: 5,
						},
					],
				});

				const { updateGTMConsent } = await import('../gtm');

				const promise = saveConsents({
					manager: mockManager,
					type: 'all',
					get: mockGet,
					set: mockSet,
					trackingBlocker: mockTrackingBlocker,
				});

				// Immediately after calling, UI update should have occurred
				expect(mockSet).toHaveBeenCalled();
				// But side-effects should be deferred
				expect(mockTrackingBlocker?.updateConsents).not.toHaveBeenCalled();
				expect(updateGTMConsent).not.toHaveBeenCalled();
				expect(onConsentSet).not.toHaveBeenCalled();

				// Run all timers to flush the yielded setTimeout(0)
				await vi.runAllTimersAsync();
				// Also flush pending microtasks queued by awaited Promises
				await Promise.resolve();

				// Now side-effects and callbacks should have executed
				expect(mockTrackingBlocker?.updateConsents).toHaveBeenCalled();
				expect(updateGTMConsent).toHaveBeenCalled();
				expect(onConsentSet).toHaveBeenCalled();

				// Allow the async function to complete
				await promise;
			} finally {
				vi.useRealTimers();
			}
		});
	});

	describe('edge cases', () => {
		it('should handle empty consent types array', async () => {
			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onConsentSet: vi.fn(),
					onError: vi.fn(),
				},
				gdprTypes: [
					'necessary',
					'functionality',
					'measurement',
					'experience',
					'marketing',
				],
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
				updateIframeConsents: vi.fn(),
				consents: {},
				consentTypes: [],
			});

			await saveConsents({
				manager: mockManager,
				type: 'all',
				get: mockGet,
				set: mockSet,
				trackingBlocker: mockTrackingBlocker,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					consents: {},
					showPopup: false,
					consentInfo: expect.objectContaining({
						type: 'all',
						time: expect.any(Number),
					}),
				})
			);
		});

		it('should handle partial consent types', async () => {
			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onConsentSet: vi.fn(),
					onError: vi.fn(),
				},
				gdprTypes: [
					'necessary',
					'functionality',
					'measurement',
					'experience',
					'marketing',
				],
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
				updateIframeConsents: vi.fn(),
				consents: {
					necessary: true,
					functionality: false,
				},
				selectedConsents: {
					necessary: true,
					functionality: false,
				},
				consentTypes: [
					{
						name: 'necessary',
						defaultValue: true,
						description: 'Necessary cookies',
						disabled: true,
						display: true,
						gdprType: 1,
					},
					{
						name: 'functionality',
						defaultValue: false,
						description: 'Functionality cookies',
						disabled: false,
						display: true,
						gdprType: 2,
					},
				],
			});

			await saveConsents({
				manager: mockManager,
				type: 'all',
				get: mockGet,
				set: mockSet,
				trackingBlocker: mockTrackingBlocker,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					consents: {
						necessary: true,
						functionality: true,
					},
					showPopup: false,
					consentInfo: expect.objectContaining({
						type: 'all',
						time: expect.any(Number),
					}),
				})
			);
		});
	});
});
