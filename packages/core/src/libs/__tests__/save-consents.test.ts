import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoreApi } from 'zustand';
import type { ConsentManagerInterface } from '../../client/client-interface';
import type { ConsentStoreState } from '../../store/type';
import { PENDING_CONSENT_SYNC_KEY, saveConsents } from '../save-consents';

describe('saveConsents', () => {
	let mockManager: ConsentManagerInterface;
	let mockGet: StoreApi<ConsentStoreState>['getState'];
	let mockSet: StoreApi<ConsentStoreState>['setState'];
	let mockLocalStorage: Storage;
	let updateScriptsMock: ReturnType<typeof vi.fn>;
	let updateIframeConsentsMock: ReturnType<typeof vi.fn>;
	let updateNetworkBlockerConsentsMock: ReturnType<typeof vi.fn>;

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
			identifyUser: vi.fn(),
			$fetch: vi.fn(),
		};

		// Create mock store functions
		updateScriptsMock = vi.fn().mockReturnValue({ loaded: [], unloaded: [] });
		updateIframeConsentsMock = vi.fn();
		updateNetworkBlockerConsentsMock = vi.fn();

		mockGet = vi.fn().mockReturnValue({
			callbacks: {
				onConsentSet: vi.fn(),
				onError: vi.fn(),
			},
			consentCategories: [
				'necessary',
				'functionality',
				'measurement',
				'experience',
				'marketing',
			],
			updateScripts: updateScriptsMock,
			updateIframeConsents: updateIframeConsentsMock,
			updateNetworkBlockerConsents: updateNetworkBlockerConsentsMock,
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
			reloadOnConsentRevoked: true,
			consentInfo: null, // No prior consent for default tests
		});

		mockSet = vi.fn();
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
				activeUI: 'none',
				consentInfo: expect.objectContaining({
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
					activeUI: 'none',
					consentInfo: expect.objectContaining({
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
				consentCategories: [
					'necessary',
					'functionality',
					'measurement',
					'experience',
					'marketing',
				],
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
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
			});

			expect(mockSet).toHaveBeenCalledWith({
				consents: customConsents,
				selectedConsents: customConsents,
				activeUI: 'none',
				consentInfo: expect.objectContaining({
					time: expect.any(Number),
				}),
			});
		});
	});

	describe('immutability (React Compiler compatibility)', () => {
		/**
		 * Regression test for https://github.com/c15t/c15t/issues/604
		 *
		 * saveConsents must always pass a NEW object reference for `consents`
		 * to `set()`. If it mutates the existing object in place and sets
		 * the same reference back, React (and React Compiler in particular)
		 * cannot detect the state change.
		 */
		it('should pass a new consents reference to set(), not mutate in place', async () => {
			const originalConsents = {
				necessary: true,
				functionality: false,
				measurement: false,
				experience: false,
				marketing: false,
			};

			mockGet = vi.fn().mockReturnValue({
				callbacks: {},
				consentCategories: [
					'necessary',
					'functionality',
					'measurement',
					'experience',
					'marketing',
				],
				updateScripts: updateScriptsMock,
				updateIframeConsents: updateIframeConsentsMock,
				updateNetworkBlockerConsents: updateNetworkBlockerConsentsMock,
				consents: originalConsents,
				selectedConsents: originalConsents, // same reference, as happens after first save
				consentTypes: [
					{
						name: 'necessary',
						defaultValue: true,
						disabled: true,
						display: true,
						gdprType: 1,
						description: '',
					},
					{
						name: 'functionality',
						defaultValue: false,
						disabled: false,
						display: true,
						gdprType: 2,
						description: '',
					},
					{
						name: 'measurement',
						defaultValue: false,
						disabled: false,
						display: true,
						gdprType: 4,
						description: '',
					},
					{
						name: 'experience',
						defaultValue: false,
						disabled: false,
						display: true,
						gdprType: 3,
						description: '',
					},
					{
						name: 'marketing',
						defaultValue: false,
						disabled: false,
						display: true,
						gdprType: 5,
						description: '',
					},
				],
				consentInfo: null,
				reloadOnConsentRevoked: false,
			});

			await saveConsents({
				manager: mockManager,
				type: 'all',
				get: mockGet,
				set: mockSet,
			});

			const setArg = (mockSet as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(setArg.consents).not.toBe(originalConsents);
			expect(setArg.consents).toEqual({
				necessary: true,
				functionality: true,
				measurement: true,
				experience: true,
				marketing: true,
			});
		});

		it('should not mutate the original consents object', async () => {
			const originalConsents = {
				necessary: true,
				functionality: true,
				measurement: true,
				experience: true,
				marketing: true,
			};
			const snapshot = { ...originalConsents };

			mockGet = vi.fn().mockReturnValue({
				callbacks: {},
				consentCategories: [
					'necessary',
					'functionality',
					'measurement',
					'experience',
					'marketing',
				],
				updateScripts: updateScriptsMock,
				updateIframeConsents: updateIframeConsentsMock,
				updateNetworkBlockerConsents: updateNetworkBlockerConsentsMock,
				consents: originalConsents,
				selectedConsents: originalConsents,
				consentTypes: [
					{
						name: 'necessary',
						defaultValue: true,
						disabled: true,
						display: true,
						gdprType: 1,
						description: '',
					},
					{
						name: 'functionality',
						defaultValue: false,
						disabled: false,
						display: true,
						gdprType: 2,
						description: '',
					},
					{
						name: 'measurement',
						defaultValue: false,
						disabled: false,
						display: true,
						gdprType: 4,
						description: '',
					},
					{
						name: 'experience',
						defaultValue: false,
						disabled: false,
						display: true,
						gdprType: 3,
						description: '',
					},
					{
						name: 'marketing',
						defaultValue: false,
						disabled: false,
						display: true,
						gdprType: 5,
						description: '',
					},
				],
				consentInfo: { time: Date.now(), subjectId: 'test' },
				reloadOnConsentRevoked: false,
			});

			await saveConsents({
				manager: mockManager,
				type: 'necessary',
				get: mockGet,
				set: mockSet,
			});

			// The original object must not have been mutated
			expect(originalConsents).toEqual(snapshot);
		});
	});

	describe('state management', () => {
		it('should update state immediately for responsive UI', async () => {
			await saveConsents({
				manager: mockManager,
				type: 'all',
				get: mockGet,
				set: mockSet,
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
					activeUI: 'none',
					consentInfo: expect.objectContaining({
						time: expect.any(Number),
					}),
				})
			);
		});
	});

	describe('network blocker integration', () => {
		it('should update network blocker consents after saving', async () => {
			await saveConsents({
				manager: mockManager,
				type: 'all',
				get: mockGet,
				set: mockSet,
			});

			expect(updateNetworkBlockerConsentsMock).toHaveBeenCalledTimes(1);
		});

		it('should update scripts before updating network blocker consents', async () => {
			const callOrder: string[] = [];

			updateScriptsMock.mockImplementation(() => {
				callOrder.push('updateScripts');
				return { loaded: [], unloaded: [] };
			});

			updateNetworkBlockerConsentsMock.mockImplementation(() => {
				callOrder.push('updateNetworkBlockerConsents');
			});

			await saveConsents({
				manager: mockManager,
				type: 'all',
				get: mockGet,
				set: mockSet,
			});

			expect(callOrder).toEqual([
				'updateScripts',
				'updateNetworkBlockerConsents',
			]);
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
				consentCategories: [
					'necessary',
					'functionality',
					'measurement',
					'experience',
					'marketing',
				],
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
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
				consentCategories: [
					'necessary',
					'functionality',
					'measurement',
					'experience',
					'marketing',
				],
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
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
				})
			).resolves.not.toThrow();
		});
	});

	describe('API integration', () => {
		it('should apply policy purpose allowlist to state and API payload', async () => {
			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onConsentSet: vi.fn(),
					onError: vi.fn(),
				},
				consentCategories: [
					'necessary',
					'functionality',
					'measurement',
					'experience',
					'marketing',
				],
				updateScripts: updateScriptsMock,
				updateIframeConsents: updateIframeConsentsMock,
				updateNetworkBlockerConsents: updateNetworkBlockerConsentsMock,
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
				reloadOnConsentRevoked: false,
				consentInfo: null,
				lastBannerFetchData: {
					policy: {
						consent: {
							purposeIds: ['necessary', 'measurement', 'marketing'],
						},
					},
				},
			});

			await saveConsents({
				manager: mockManager,
				type: 'all',
				get: mockGet,
				set: mockSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					consents: {
						necessary: true,
						functionality: false,
						measurement: true,
						experience: false,
						marketing: true,
					},
					selectedConsents: {
						necessary: true,
						functionality: false,
						measurement: true,
						experience: false,
						marketing: true,
					},
				})
			);

			expect(mockManager.setConsent).toHaveBeenCalledWith({
				body: expect.objectContaining({
					preferences: {
						necessary: true,
						functionality: false,
						measurement: true,
						experience: false,
						marketing: true,
					},
				}),
			});
		});

		it('should call manager.setConsent with correct parameters including uiSource', async () => {
			await saveConsents({
				manager: mockManager,
				type: 'all',
				get: mockGet,
				set: mockSet,
				options: { uiSource: 'banner' },
			});

			expect(mockManager.setConsent).toHaveBeenCalledWith({
				body: expect.objectContaining({
					type: 'cookie_banner',
					domain: 'test.example.com',
					preferences: {
						necessary: true,
						functionality: true,
						measurement: true,
						experience: true,
						marketing: true,
					},
					uiSource: 'banner',
				}),
			});

			// Should NOT contain hardcoded metadata
			const callBody = (mockManager.setConsent as ReturnType<typeof vi.fn>).mock
				.calls[0][0].body;
			expect(callBody.metadata).toBeUndefined();
		});

		it('should default uiSource to "api" when no options provided', async () => {
			await saveConsents({
				manager: mockManager,
				type: 'all',
				get: mockGet,
				set: mockSet,
			});

			expect(mockManager.setConsent).toHaveBeenCalledWith({
				body: expect.objectContaining({
					uiSource: 'api',
				}),
			});
		});

		it('should handle API success correctly', async () => {
			mockManager.setConsent = vi.fn().mockResolvedValue({ ok: true });

			await saveConsents({
				manager: mockManager,
				type: 'all',
				get: mockGet,
				set: mockSet,
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
				consentCategories: [
					'necessary',
					'functionality',
					'measurement',
					'experience',
					'marketing',
				],
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
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
				consentCategories: [
					'necessary',
					'functionality',
					'measurement',
					'experience',
					'marketing',
				],
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
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
				consentCategories: [
					'necessary',
					'functionality',
					'measurement',
					'experience',
					'marketing',
				],
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
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
			});

			expect(mockOnError).toHaveBeenCalledWith({
				error: 'Failed to save consents',
			});
		});
	});

	describe('edge cases', () => {
		it('should handle empty consent types array', async () => {
			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onConsentSet: vi.fn(),
					onError: vi.fn(),
				},
				consentCategories: [
					'necessary',
					'functionality',
					'measurement',
					'experience',
					'marketing',
				],
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				consents: {},
				consentTypes: [],
				reloadOnConsentRevoked: true,
			});

			await saveConsents({
				manager: mockManager,
				type: 'all',
				get: mockGet,
				set: mockSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					consents: {},
					activeUI: 'none',
					consentInfo: expect.objectContaining({
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
				consentCategories: [
					'necessary',
					'functionality',
					'measurement',
					'experience',
					'marketing',
				],
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
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
				reloadOnConsentRevoked: true,
			});

			await saveConsents({
				manager: mockManager,
				type: 'all',
				get: mockGet,
				set: mockSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					consents: {
						necessary: true,
						functionality: true,
					},
					activeUI: 'none',
					consentInfo: expect.objectContaining({
						time: expect.any(Number),
					}),
				})
			);
		});
	});

	describe('consent revocation reload', () => {
		let mockReload: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			mockReload = vi.fn();
			vi.stubGlobal('window', {
				...globalThis.window,
				localStorage: mockLocalStorage,
				location: {
					hostname: 'test.example.com',
					protocol: 'https:',
					reload: mockReload,
				},
			});
		});

		it('should reload page when consent is revoked and reloadOnConsentRevoked is true', async () => {
			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onConsentSet: vi.fn(),
					onBeforeConsentRevocationReload: vi.fn(),
				},
				consentCategories: ['necessary', 'marketing'],
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				consents: {
					necessary: true,
					marketing: true, // Previously granted
				},
				selectedConsents: {
					necessary: true,
					marketing: false, // Now revoking
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
						name: 'marketing',
						defaultValue: false,
						description: 'Marketing',
						disabled: false,
						display: true,
						gdprType: 5,
					},
				],
				consentInfo: { time: Date.now(), subjectId: 'test-subject' }, // Has prior consent
				reloadOnConsentRevoked: true,
			});

			await saveConsents({
				manager: mockManager,
				type: 'custom',
				get: mockGet,
				set: mockSet,
			});

			expect(mockReload).toHaveBeenCalled();
		});

		it('should NOT reload when no prior consent exists (first visit decline)', async () => {
			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onConsentSet: vi.fn(),
				},
				consentCategories: ['necessary', 'marketing'],
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				consents: {
					necessary: true,
					marketing: false,
				},
				selectedConsents: {
					necessary: true,
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
						name: 'marketing',
						defaultValue: false,
						description: 'Marketing',
						disabled: false,
						display: true,
						gdprType: 5,
					},
				],
				consentInfo: null, // No prior consent
				reloadOnConsentRevoked: true,
			});

			await saveConsents({
				manager: mockManager,
				type: 'necessary',
				get: mockGet,
				set: mockSet,
			});

			expect(mockReload).not.toHaveBeenCalled();
		});

		it('should NOT reload when adding consent (not revoking)', async () => {
			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onConsentSet: vi.fn(),
				},
				consentCategories: ['necessary', 'marketing'],
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				consents: {
					necessary: true,
					marketing: false, // Previously denied
				},
				selectedConsents: {
					necessary: true,
					marketing: true, // Now granting
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
						name: 'marketing',
						defaultValue: false,
						description: 'Marketing',
						disabled: false,
						display: true,
						gdprType: 5,
					},
				],
				consentInfo: { time: Date.now(), subjectId: 'test-subject' },
				reloadOnConsentRevoked: true,
			});

			await saveConsents({
				manager: mockManager,
				type: 'custom',
				get: mockGet,
				set: mockSet,
			});

			expect(mockReload).not.toHaveBeenCalled();
		});

		it('should NOT reload when reloadOnConsentRevoked is false', async () => {
			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onConsentSet: vi.fn(),
				},
				consentCategories: ['necessary', 'marketing'],
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				consents: {
					necessary: true,
					marketing: true,
				},
				selectedConsents: {
					necessary: true,
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
						name: 'marketing',
						defaultValue: false,
						description: 'Marketing',
						disabled: false,
						display: true,
						gdprType: 5,
					},
				],
				consentInfo: { time: Date.now(), subjectId: 'test-subject' },
				reloadOnConsentRevoked: false, // Disabled
			});

			await saveConsents({
				manager: mockManager,
				type: 'custom',
				get: mockGet,
				set: mockSet,
			});

			expect(mockReload).not.toHaveBeenCalled();
		});

		it('should store pending sync data before reload', async () => {
			const mockOnBeforeReload = vi.fn();

			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onConsentSet: vi.fn(),
					onBeforeConsentRevocationReload: mockOnBeforeReload,
				},
				consentCategories: ['necessary', 'marketing'],
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				consents: {
					necessary: true,
					marketing: true,
				},
				selectedConsents: {
					necessary: true,
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
						name: 'marketing',
						defaultValue: false,
						description: 'Marketing',
						disabled: false,
						display: true,
						gdprType: 5,
					},
				],
				consentInfo: { time: Date.now(), subjectId: 'existing-subject' },
				reloadOnConsentRevoked: true,
				locationInfo: { jurisdiction: 'GDPR' },
				model: 'opt-in',
				lastBannerFetchData: {
					policySnapshotToken: 'snapshot-token-123',
				},
			});

			await saveConsents({
				manager: mockManager,
				type: 'custom',
				get: mockGet,
				set: mockSet,
			});

			// Should store pending sync
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				PENDING_CONSENT_SYNC_KEY,
				expect.any(String)
			);

			const storedData = JSON.parse(
				(mockLocalStorage.setItem as ReturnType<typeof vi.fn>).mock.calls[0][1]
			);
			expect(storedData.policySnapshotToken).toBe('snapshot-token-123');

			// Should call onBeforeConsentRevocationReload callback
			expect(mockOnBeforeReload).toHaveBeenCalledWith({
				preferences: {
					necessary: true,
					marketing: false,
				},
			});

			// Should reload
			expect(mockReload).toHaveBeenCalled();
		});

		it('should store uiSource in pending sync data', async () => {
			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onConsentSet: vi.fn(),
					onBeforeConsentRevocationReload: vi.fn(),
				},
				consentCategories: ['necessary', 'marketing'],
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				consents: {
					necessary: true,
					marketing: true,
				},
				selectedConsents: {
					necessary: true,
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
						name: 'marketing',
						defaultValue: false,
						description: 'Marketing',
						disabled: false,
						display: true,
						gdprType: 5,
					},
				],
				consentInfo: { time: Date.now(), subjectId: 'existing-subject' },
				reloadOnConsentRevoked: true,
				locationInfo: { jurisdiction: 'GDPR' },
				model: 'opt-in',
			});

			await saveConsents({
				manager: mockManager,
				type: 'custom',
				get: mockGet,
				set: mockSet,
				options: { uiSource: 'dialog' },
			});

			// Verify uiSource is stored in pending sync
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				PENDING_CONSENT_SYNC_KEY,
				expect.any(String)
			);

			const storedData = JSON.parse(
				(mockLocalStorage.setItem as ReturnType<typeof vi.fn>).mock.calls[0][1]
			);
			expect(storedData.uiSource).toBe('dialog');
		});

		it('should NOT call API when reload is triggered', async () => {
			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onConsentSet: vi.fn(),
				},
				consentCategories: ['necessary', 'marketing'],
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				consents: {
					necessary: true,
					marketing: true,
				},
				selectedConsents: {
					necessary: true,
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
						name: 'marketing',
						defaultValue: false,
						description: 'Marketing',
						disabled: false,
						display: true,
						gdprType: 5,
					},
				],
				consentInfo: { time: Date.now(), subjectId: 'test-subject' },
				reloadOnConsentRevoked: true,
			});

			await saveConsents({
				manager: mockManager,
				type: 'custom',
				get: mockGet,
				set: mockSet,
			});

			// API should NOT be called when reload is triggered
			// (sync happens after reload)
			expect(mockManager.setConsent).not.toHaveBeenCalled();
		});
	});
});
