import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoreApi } from 'zustand';
import type { ConsentManagerInterface } from '../../client/client-interface';
import type { ConsentStoreState } from '../../store/type';
import { saveConsents } from '../save-consents';

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
			gdprTypes: [
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
				showPopup: false,
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
					showPopup: false,
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
				gdprTypes: [
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
				showPopup: false,
				consentInfo: expect.objectContaining({
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
				gdprTypes: [
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
				gdprTypes: [
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
		it('should call manager.setConsent with correct parameters', async () => {
			await saveConsents({
				manager: mockManager,
				type: 'all',
				get: mockGet,
				set: mockSet,
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
					metadata: expect.objectContaining({
						source: 'consent_widget',
						acceptanceMethod: 'all',
					}),
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
				gdprTypes: [
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
				gdprTypes: [
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
				gdprTypes: [
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
				gdprTypes: [
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
					showPopup: false,
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
				gdprTypes: [
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
					showPopup: false,
					consentInfo: expect.objectContaining({
						time: expect.any(Number),
					}),
				})
			);
		});
	});
});
