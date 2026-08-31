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
			clear: vi.fn(),
			getItem: vi.fn(),
			key: vi.fn(),
			length: 0,
			removeItem: vi.fn(),
			setItem: vi.fn(),
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
			$fetch: vi.fn(),
			identifyUser: vi.fn(),
			setConsent: vi.fn().mockResolvedValue({ ok: true }),
			showConsentBanner: vi.fn(),
			verifyConsent: vi.fn(),
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
			// No prior consent for default tests
			consentInfo: null,
			consentTypes: [
				{
					defaultValue: true,
					description: 'Necessary cookies',
					disabled: true,
					display: true,
					gdprType: 1,

					name: 'necessary',
				},
				{
					defaultValue: false,
					description: 'Functionality cookies',
					disabled: false,
					display: true,
					gdprType: 2,

					name: 'functionality',
				},
				{
					defaultValue: false,
					description: 'Measurement cookies',
					disabled: false,
					display: true,
					gdprType: 4,

					name: 'measurement',
				},
				{
					defaultValue: false,
					description: 'Experience cookies',
					disabled: false,
					display: true,
					gdprType: 3,

					name: 'experience',
				},
				{
					defaultValue: false,
					description: 'Marketing cookies',
					disabled: false,
					display: true,
					gdprType: 5,

					name: 'marketing',
				},
			],
			consents: {
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			},
			reloadOnConsentRevoked: true,
			updateIframeConsents: updateIframeConsentsMock,
			updateNetworkBlockerConsents: updateNetworkBlockerConsentsMock,
			updateScripts: updateScriptsMock,
		});

		mockSet = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('consent type handling', () => {
		it('should set all consents to true when type is "all"', async () => {
			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'all',
			});

			expect(mockSet).toHaveBeenCalledWith({
				activeUI: 'none',
				consentInfo: expect.objectContaining({
					time: expect.any(Number),
				}),
				consents: {
					experience: true,
					functionality: true,
					marketing: true,
					measurement: true,
					necessary: true,
				},
				selectedConsents: {
					experience: true,
					functionality: true,
					marketing: true,
					measurement: true,
					necessary: true,
				},
			});
		});

		it('should set only necessary consent to true when type is "necessary"', async () => {
			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'necessary',
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					activeUI: 'none',
					consentInfo: expect.objectContaining({
						time: expect.any(Number),
					}),
					consents: {
						experience: false,
						functionality: false,
						marketing: false,
						measurement: false,
						necessary: true,
					},
				})
			);
		});

		it('should preserve existing consents when type is "custom"', async () => {
			const customConsents = {
				experience: true,
				functionality: true,
				marketing: false,
				measurement: false,
				necessary: true,
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
				consentTypes: [
					{
						defaultValue: true,
						description: 'Necessary cookies',
						disabled: true,
						display: true,
						gdprType: 1,

						name: 'necessary',
					},
					{
						defaultValue: false,
						description: 'Functionality cookies',
						disabled: false,
						display: true,
						gdprType: 2,

						name: 'functionality',
					},
					{
						defaultValue: false,
						description: 'Measurement cookies',
						disabled: false,
						display: true,
						gdprType: 4,

						name: 'measurement',
					},
					{
						defaultValue: false,
						description: 'Experience cookies',
						disabled: false,
						display: true,
						gdprType: 3,

						name: 'experience',
					},
					{
						defaultValue: false,
						description: 'Marketing cookies',
						disabled: false,
						display: true,
						gdprType: 5,

						name: 'marketing',
					},
				],
				consents: customConsents,
				selectedConsents: customConsents,
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
			});

			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'custom',
			});

			expect(mockSet).toHaveBeenCalledWith({
				activeUI: 'none',
				consentInfo: expect.objectContaining({
					time: expect.any(Number),
				}),
				consents: customConsents,
				selectedConsents: customConsents,
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
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
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
				consentInfo: null,
				consentTypes: [
					{
						defaultValue: true,
						description: '',

						disabled: true,
						display: true,
						gdprType: 1,
						name: 'necessary',
					},
					{
						defaultValue: false,
						description: '',

						disabled: false,
						display: true,
						gdprType: 2,
						name: 'functionality',
					},
					{
						defaultValue: false,
						description: '',

						disabled: false,
						display: true,
						gdprType: 4,
						name: 'measurement',
					},
					{
						defaultValue: false,
						description: '',

						disabled: false,
						display: true,
						gdprType: 3,
						name: 'experience',
					},
					{
						defaultValue: false,
						description: '',

						disabled: false,
						display: true,
						gdprType: 5,
						name: 'marketing',
					},
				],
				consents: originalConsents,
				reloadOnConsentRevoked: false,
				// same reference, as happens after first save
				selectedConsents: originalConsents,
				updateIframeConsents: updateIframeConsentsMock,
				updateNetworkBlockerConsents: updateNetworkBlockerConsentsMock,
				updateScripts: updateScriptsMock,
			});

			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'all',
			});

			// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
			const setArg = (mockSet as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(setArg.consents).not.toBe(originalConsents);
			expect(setArg.consents).toEqual({
				experience: true,
				functionality: true,
				marketing: true,
				measurement: true,
				necessary: true,
			});
		});

		it('should not mutate the original consents object', async () => {
			const originalConsents = {
				experience: true,
				functionality: true,
				marketing: true,
				measurement: true,
				necessary: true,
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
				consentInfo: { subjectId: 'test', time: Date.now() },
				consentTypes: [
					{
						defaultValue: true,
						description: '',

						disabled: true,
						display: true,
						gdprType: 1,
						name: 'necessary',
					},
					{
						defaultValue: false,
						description: '',

						disabled: false,
						display: true,
						gdprType: 2,
						name: 'functionality',
					},
					{
						defaultValue: false,
						description: '',

						disabled: false,
						display: true,
						gdprType: 4,
						name: 'measurement',
					},
					{
						defaultValue: false,
						description: '',

						disabled: false,
						display: true,
						gdprType: 3,
						name: 'experience',
					},
					{
						defaultValue: false,
						description: '',

						disabled: false,
						display: true,
						gdprType: 5,
						name: 'marketing',
					},
				],
				consents: originalConsents,
				reloadOnConsentRevoked: false,
				selectedConsents: originalConsents,
				updateIframeConsents: updateIframeConsentsMock,
				updateNetworkBlockerConsents: updateNetworkBlockerConsentsMock,
				updateScripts: updateScriptsMock,
			});

			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'necessary',
			});

			// The original object must not have been mutated
			expect(originalConsents).toEqual(snapshot);
		});
	});

	describe('state management', () => {
		it('should update state immediately for responsive UI', async () => {
			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'all',
			});

			// Verify state was updated with new consents
			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					activeUI: 'none',
					consentInfo: expect.objectContaining({
						time: expect.any(Number),
					}),
					consents: expect.objectContaining({
						experience: true,
						functionality: true,
						marketing: true,

						measurement: true,
						necessary: true,
					}),
				})
			);
		});

		it('should attach the active material policy fingerprint to saved consent info', async () => {
			mockGet = vi.fn().mockReturnValue({
				...mockGet(),
				lastBannerFetchData: {
					policy: {
						consent: {
							categories: ['necessary', 'measurement'],
							expiryDays: 365,
							scopeMode: 'strict',
						},
						id: 'policy_runtime_gdpr',
						model: 'opt-in',
						ui: {
							banner: {
								allowedActions: ['accept', 'reject'],
								direction: 'row',
								layout: [['accept', 'reject']],
								primaryActions: ['accept'],
							},
							mode: 'banner',
						},
					},
				},
				reloadOnConsentRevoked: false,
			});

			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'all',
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					consentInfo: expect.objectContaining({
						materialPolicyFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/u),
					}),
				})
			);
		});
	});

	describe('network blocker integration', () => {
		it('should update network blocker consents after saving', async () => {
			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'all',
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
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'all',
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
				consentTypes: [
					{
						defaultValue: true,
						description: 'Necessary cookies',
						disabled: true,
						display: true,
						gdprType: 1,

						name: 'necessary',
					},
					{
						defaultValue: false,
						description: 'Functionality cookies',
						disabled: false,
						display: true,
						gdprType: 2,

						name: 'functionality',
					},
					{
						defaultValue: false,
						description: 'Measurement cookies',
						disabled: false,
						display: true,
						gdprType: 4,

						name: 'measurement',
					},
					{
						defaultValue: false,
						description: 'Experience cookies',
						disabled: false,
						display: true,
						gdprType: 3,

						name: 'experience',
					},
					{
						defaultValue: false,
						description: 'Marketing cookies',
						disabled: false,
						display: true,
						gdprType: 5,

						name: 'marketing',
					},
				],
				consents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
				},
				selectedConsents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
				},
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
			});

			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'necessary',
			});

			expect(mockOnConsentSet).toHaveBeenCalledWith({
				preferences: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
				},
			});
		});

		it('should emit change-only payload when saved preferences change', async () => {
			const mockOnConsentChanged = vi.fn();

			await saveConsents({
				emitConsentChanged: mockOnConsentChanged,
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'all',
			});

			expect(mockOnConsentChanged).toHaveBeenCalledTimes(1);
			expect(mockOnConsentChanged).toHaveBeenCalledWith({
				allowedCategories: [
					'necessary',
					'functionality',
					'measurement',
					'experience',
					'marketing',
				],
				deniedCategories: [],
				preferences: {
					experience: true,
					functionality: true,
					marketing: true,
					measurement: true,
					necessary: true,
				},
				previousAllowedCategories: ['necessary'],
				previousDeniedCategories: [
					'functionality',
					'measurement',
					'experience',
					'marketing',
				],
				previousPreferences: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
				},
			});
		});

		it('should not emit change-only payload when saved preferences do not change', async () => {
			const mockOnConsentChanged = vi.fn();

			mockGet = vi.fn().mockReturnValue({
				...mockGet(),
				consents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
				},
				reloadOnConsentRevoked: false,
				selectedConsents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
				},
			});

			await saveConsents({
				emitConsentChanged: mockOnConsentChanged,
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'custom',
			});

			expect(mockOnConsentChanged).not.toHaveBeenCalled();
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
				consentTypes: [
					{
						defaultValue: true,
						description: 'Necessary cookies',
						disabled: true,
						display: true,
						gdprType: 1,

						name: 'necessary',
					},
					{
						defaultValue: false,
						description: 'Functionality cookies',
						disabled: false,
						display: true,
						gdprType: 2,

						name: 'functionality',
					},
					{
						defaultValue: false,
						description: 'Measurement cookies',
						disabled: false,
						display: true,
						gdprType: 4,

						name: 'measurement',
					},
					{
						defaultValue: false,
						description: 'Experience cookies',
						disabled: false,
						display: true,
						gdprType: 3,

						name: 'experience',
					},
					{
						defaultValue: false,
						description: 'Marketing cookies',
						disabled: false,
						display: true,
						gdprType: 5,

						name: 'marketing',
					},
				],
				consents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
				},
				selectedConsents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
				},
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
			});

			await expect(
				saveConsents({
					get: mockGet,
					manager: mockManager,
					set: mockSet,
					type: 'necessary',
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
				consentInfo: null,
				consentTypes: [
					{
						defaultValue: true,
						description: 'Necessary cookies',
						disabled: true,
						display: true,
						gdprType: 1,

						name: 'necessary',
					},
					{
						defaultValue: false,
						description: 'Functionality cookies',
						disabled: false,
						display: true,
						gdprType: 2,

						name: 'functionality',
					},
					{
						defaultValue: false,
						description: 'Measurement cookies',
						disabled: false,
						display: true,
						gdprType: 4,

						name: 'measurement',
					},
					{
						defaultValue: false,
						description: 'Experience cookies',
						disabled: false,
						display: true,
						gdprType: 3,

						name: 'experience',
					},
					{
						defaultValue: false,
						description: 'Marketing cookies',
						disabled: false,
						display: true,
						gdprType: 5,

						name: 'marketing',
					},
				],
				consents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
				},
				lastBannerFetchData: {
					policy: {
						consent: {
							categories: ['necessary', 'measurement', 'marketing'],
							scopeMode: 'strict',
						},
					},
				},
				reloadOnConsentRevoked: false,
				selectedConsents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
				},
				updateIframeConsents: updateIframeConsentsMock,
				updateNetworkBlockerConsents: updateNetworkBlockerConsentsMock,
				updateScripts: updateScriptsMock,
			});

			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'all',
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					consents: {
						experience: false,
						functionality: false,
						marketing: true,
						measurement: true,
						necessary: true,
					},
					selectedConsents: {
						experience: false,
						functionality: false,
						marketing: true,
						measurement: true,
						necessary: true,
					},
				})
			);

			expect(mockManager.setConsent).toHaveBeenCalledWith({
				body: expect.objectContaining({
					preferences: {
						marketing: true,
						measurement: true,
						necessary: true,
					},
				}),
			});
		});

		it('should keep configured preferences for permissive policy scope', async () => {
			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onConsentSet: vi.fn(),
					onError: vi.fn(),
				},
				consentCategories: ['necessary', 'measurement', 'marketing'],
				consentInfo: null,
				consentTypes: [
					{
						defaultValue: true,
						description: 'Necessary cookies',
						disabled: true,
						display: true,
						gdprType: 1,

						name: 'necessary',
					},
					{
						defaultValue: false,
						description: 'Measurement cookies',
						disabled: false,
						display: true,
						gdprType: 4,

						name: 'measurement',
					},
					{
						defaultValue: false,
						description: 'Marketing cookies',
						disabled: false,
						display: true,
						gdprType: 5,

						name: 'marketing',
					},
				],
				consents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
				},
				lastBannerFetchData: {
					policy: {
						consent: {
							categories: ['necessary'],
							scopeMode: 'permissive',
						},
					},
				},
				reloadOnConsentRevoked: false,
				selectedConsents: {
					experience: false,
					functionality: false,
					marketing: true,
					measurement: true,
					necessary: true,
				},
				updateIframeConsents: updateIframeConsentsMock,
				updateNetworkBlockerConsents: updateNetworkBlockerConsentsMock,
				updateScripts: updateScriptsMock,
			});

			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'custom',
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					consents: expect.objectContaining({
						marketing: true,
						measurement: true,
						necessary: true,
					}),
				})
			);
			expect(mockManager.setConsent).toHaveBeenCalledWith({
				body: expect.objectContaining({
					preferences: expect.objectContaining({
						marketing: true,
						measurement: true,
						necessary: true,
					}),
				}),
			});
		});

		it('should call manager.setConsent with correct parameters including uiSource', async () => {
			await saveConsents({
				get: mockGet,
				manager: mockManager,
				options: { uiSource: 'banner' },
				set: mockSet,
				type: 'all',
			});

			expect(mockManager.setConsent).toHaveBeenCalledWith({
				body: expect.objectContaining({
					domain: 'test.example.com',
					preferences: {
						experience: true,
						functionality: true,
						marketing: true,
						measurement: true,
						necessary: true,
					},
					type: 'cookie_banner',
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
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'all',
			});

			expect(mockManager.setConsent).toHaveBeenCalledWith({
				body: expect.objectContaining({
					uiSource: 'api',
				}),
			});
		});

		it('should omit invalid optional identifiers from the request body', async () => {
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
				consentInfo: {
					externalId: 'undefined',
					identityProvider: null,
					subjectId: 'sub_111AEMh5qpiLmhEcbnqwrmsB7X',
					time: Date.now(),
				},
				consentTypes: [
					{
						defaultValue: true,
						description: 'Necessary cookies',
						disabled: true,
						display: true,
						gdprType: 1,

						name: 'necessary',
					},
					{
						defaultValue: false,
						description: 'Functionality cookies',
						disabled: false,
						display: true,
						gdprType: 2,

						name: 'functionality',
					},
					{
						defaultValue: false,
						description: 'Measurement cookies',
						disabled: false,
						display: true,
						gdprType: 4,

						name: 'measurement',
					},
					{
						defaultValue: false,
						description: 'Experience cookies',
						disabled: false,
						display: true,
						gdprType: 3,

						name: 'experience',
					},
					{
						defaultValue: false,
						description: 'Marketing cookies',
						disabled: false,
						display: true,
						gdprType: 5,

						name: 'marketing',
					},
				],
				consents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
				},
				reloadOnConsentRevoked: false,
				selectedConsents: {
					experience: false,
					functionality: true,
					marketing: false,
					measurement: false,
					necessary: true,
				},
				updateIframeConsents: updateIframeConsentsMock,
				updateNetworkBlockerConsents: updateNetworkBlockerConsentsMock,
				updateScripts: updateScriptsMock,
			});

			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'custom',
			});

			const callBody = (mockManager.setConsent as ReturnType<typeof vi.fn>).mock
				.calls[0][0].body;

			expect(callBody.externalSubjectId).toBeUndefined();
			expect(callBody.identityProvider).toBeUndefined();

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					consentInfo: {
						subjectId: 'sub_111AEMh5qpiLmhEcbnqwrmsB7X',
						time: expect.any(Number),
					},
				})
			);
		});

		it('should handle API success correctly', async () => {
			mockManager.setConsent = vi.fn().mockResolvedValue({ ok: true });

			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'all',
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
				consentTypes: [
					{
						defaultValue: true,
						description: 'Necessary cookies',
						disabled: true,
						display: true,
						gdprType: 1,

						name: 'necessary',
					},
					{
						defaultValue: false,
						description: 'Functionality cookies',
						disabled: false,
						display: true,
						gdprType: 2,

						name: 'functionality',
					},
					{
						defaultValue: false,
						description: 'Measurement cookies',
						disabled: false,
						display: true,
						gdprType: 4,

						name: 'measurement',
					},
					{
						defaultValue: false,
						description: 'Experience cookies',
						disabled: false,
						display: true,
						gdprType: 3,

						name: 'experience',
					},
					{
						defaultValue: false,
						description: 'Marketing cookies',
						disabled: false,
						display: true,
						gdprType: 5,

						name: 'marketing',
					},
				],
				consents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
				},
				selectedConsents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
				},
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
			});

			mockManager.setConsent = vi.fn().mockResolvedValue({
				error: { message: errorMessage },
				ok: false,
			});

			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'all',
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
				consentTypes: [
					{
						defaultValue: true,
						description: 'Necessary cookies',
						disabled: true,
						display: true,
						gdprType: 1,

						name: 'necessary',
					},
					{
						defaultValue: false,
						description: 'Functionality cookies',
						disabled: false,
						display: true,
						gdprType: 2,

						name: 'functionality',
					},
					{
						defaultValue: false,
						description: 'Measurement cookies',
						disabled: false,
						display: true,
						gdprType: 4,

						name: 'measurement',
					},
					{
						defaultValue: false,
						description: 'Experience cookies',
						disabled: false,
						display: true,
						gdprType: 3,

						name: 'experience',
					},
					{
						defaultValue: false,
						description: 'Marketing cookies',
						disabled: false,
						display: true,
						gdprType: 5,

						name: 'marketing',
					},
				],
				consents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
				},
				selectedConsents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
				},
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
			});

			mockManager.setConsent = vi.fn().mockResolvedValue({
				error: { message: 'API request failed' },
				ok: false,
			});

			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'all',
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
				consentTypes: [
					{
						defaultValue: true,
						description: 'Necessary cookies',
						disabled: true,
						display: true,
						gdprType: 1,

						name: 'necessary',
					},
					{
						defaultValue: false,
						description: 'Functionality cookies',
						disabled: false,
						display: true,
						gdprType: 2,

						name: 'functionality',
					},
					{
						defaultValue: false,
						description: 'Measurement cookies',
						disabled: false,
						display: true,
						gdprType: 4,

						name: 'measurement',
					},
					{
						defaultValue: false,
						description: 'Experience cookies',
						disabled: false,
						display: true,
						gdprType: 3,

						name: 'experience',
					},
					{
						defaultValue: false,
						description: 'Marketing cookies',
						disabled: false,
						display: true,
						gdprType: 5,

						name: 'marketing',
					},
				],
				consents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
				},
				selectedConsents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
				},
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
			});

			mockManager.setConsent = vi.fn().mockResolvedValue({
				error: undefined,
				ok: false,
			});

			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'all',
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
				consentTypes: [],
				consents: {},
				reloadOnConsentRevoked: true,
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
			});

			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'all',
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					activeUI: 'none',
					consentInfo: expect.objectContaining({
						time: expect.any(Number),
					}),
					consents: {},
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
				consentTypes: [
					{
						defaultValue: true,
						description: 'Necessary cookies',
						disabled: true,
						display: true,
						gdprType: 1,

						name: 'necessary',
					},
					{
						defaultValue: false,
						description: 'Functionality cookies',
						disabled: false,
						display: true,
						gdprType: 2,

						name: 'functionality',
					},
				],
				consents: {
					functionality: false,
					necessary: true,
				},
				reloadOnConsentRevoked: true,
				selectedConsents: {
					functionality: false,
					necessary: true,
				},
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
			});

			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'all',
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					activeUI: 'none',
					consentInfo: expect.objectContaining({
						time: expect.any(Number),
					}),
					consents: {
						functionality: true,
						necessary: true,
					},
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
					onBeforeConsentRevocationReload: vi.fn(),
					onConsentSet: vi.fn(),
				},
				consentCategories: ['necessary', 'marketing'],
				// Has prior consent
				consentInfo: { subjectId: 'test-subject', time: Date.now() },
				consentTypes: [
					{
						defaultValue: true,
						description: 'Necessary',
						disabled: true,
						display: true,
						gdprType: 1,

						name: 'necessary',
					},
					{
						defaultValue: false,
						description: 'Marketing',
						disabled: false,
						display: true,
						gdprType: 5,

						name: 'marketing',
					},
				],
				consents: {
					// Previously granted
					marketing: true,
					necessary: true,
				},
				reloadOnConsentRevoked: true,
				selectedConsents: {
					// Now revoking
					marketing: false,
					necessary: true,
				},
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
			});

			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'custom',
			});

			expect(mockReload).toHaveBeenCalled();
		});

		it('should NOT reload when no prior consent exists (first visit decline)', async () => {
			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onConsentSet: vi.fn(),
				},
				consentCategories: ['necessary', 'marketing'],
				// No prior consent
				consentInfo: null,
				consentTypes: [
					{
						defaultValue: true,
						description: 'Necessary',
						disabled: true,
						display: true,
						gdprType: 1,

						name: 'necessary',
					},
					{
						defaultValue: false,
						description: 'Marketing',
						disabled: false,
						display: true,
						gdprType: 5,

						name: 'marketing',
					},
				],
				consents: {
					marketing: false,
					necessary: true,
				},
				reloadOnConsentRevoked: true,
				selectedConsents: {
					marketing: false,
					necessary: true,
				},
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
			});

			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'necessary',
			});

			expect(mockReload).not.toHaveBeenCalled();
		});

		it('should NOT reload when adding consent (not revoking)', async () => {
			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onConsentSet: vi.fn(),
				},
				consentCategories: ['necessary', 'marketing'],
				consentInfo: { subjectId: 'test-subject', time: Date.now() },
				consentTypes: [
					{
						defaultValue: true,
						description: 'Necessary',
						disabled: true,
						display: true,
						gdprType: 1,

						name: 'necessary',
					},
					{
						defaultValue: false,
						description: 'Marketing',
						disabled: false,
						display: true,
						gdprType: 5,

						name: 'marketing',
					},
				],
				consents: {
					// Previously denied
					marketing: false,
					necessary: true,
				},
				reloadOnConsentRevoked: true,
				selectedConsents: {
					// Now granting
					marketing: true,
					necessary: true,
				},
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
			});

			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'custom',
			});

			expect(mockReload).not.toHaveBeenCalled();
		});

		it('should NOT reload when reloadOnConsentRevoked is false', async () => {
			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onConsentSet: vi.fn(),
				},
				consentCategories: ['necessary', 'marketing'],
				consentInfo: { subjectId: 'test-subject', time: Date.now() },
				consentTypes: [
					{
						defaultValue: true,
						description: 'Necessary',
						disabled: true,
						display: true,
						gdprType: 1,

						name: 'necessary',
					},
					{
						defaultValue: false,
						description: 'Marketing',
						disabled: false,
						display: true,
						gdprType: 5,

						name: 'marketing',
					},
				],
				consents: {
					marketing: true,
					necessary: true,
				},
				// Disabled
				reloadOnConsentRevoked: false,
				selectedConsents: {
					marketing: false,
					necessary: true,
				},
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
			});

			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'custom',
			});

			expect(mockReload).not.toHaveBeenCalled();
		});

		it('should store pending sync data before reload', async () => {
			const callOrder: string[] = [];
			const mockOnConsentChanged = vi.fn(() => {
				callOrder.push('onConsentChanged');
			});

			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onBeforeConsentRevocationReload: vi.fn(() => {
						callOrder.push('onBeforeConsentRevocationReload');
					}),
					onConsentSet: vi.fn(() => {
						callOrder.push('onConsentSet');
					}),
				},
				consentCategories: ['necessary', 'marketing'],
				consentInfo: { subjectId: 'existing-subject', time: Date.now() },
				consentTypes: [
					{
						defaultValue: true,
						description: 'Necessary',
						disabled: true,
						display: true,
						gdprType: 1,

						name: 'necessary',
					},
					{
						defaultValue: false,
						description: 'Marketing',
						disabled: false,
						display: true,
						gdprType: 5,

						name: 'marketing',
					},
				],
				consents: {
					marketing: true,
					necessary: true,
				},
				lastBannerFetchData: {
					policySnapshotToken: 'snapshot-token-123',
				},
				locationInfo: { jurisdiction: 'GDPR' },
				model: 'opt-in',
				reloadOnConsentRevoked: true,
				selectedConsents: {
					marketing: false,
					necessary: true,
				},
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
			});

			await saveConsents({
				emitConsentChanged: mockOnConsentChanged,
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'custom',
			});

			// Should store pending sync
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				PENDING_CONSENT_SYNC_KEY,
				expect.any(String)
			);

			const pendingSyncCall = (
				mockLocalStorage.setItem as ReturnType<typeof vi.fn>
			).mock.calls.find(([key]) => key === PENDING_CONSENT_SYNC_KEY);
			const storedData = JSON.parse(String(pendingSyncCall?.[1]));
			expect(storedData.policySnapshotToken).toBe('snapshot-token-123');

			expect(callOrder).toEqual([
				'onConsentSet',
				'onConsentChanged',
				'onBeforeConsentRevocationReload',
			]);
			expect(mockOnConsentChanged).toHaveBeenCalledWith({
				allowedCategories: ['necessary'],
				deniedCategories: ['marketing'],
				preferences: {
					marketing: false,
					necessary: true,
				},
				previousAllowedCategories: ['necessary', 'marketing'],
				previousDeniedCategories: [],
				previousPreferences: {
					marketing: true,
					necessary: true,
				},
			});

			// Should reload
			expect(mockReload).toHaveBeenCalled();
		});

		it('should store uiSource in pending sync data', async () => {
			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onBeforeConsentRevocationReload: vi.fn(),
					onConsentSet: vi.fn(),
				},
				consentCategories: ['necessary', 'marketing'],
				consentInfo: { subjectId: 'existing-subject', time: Date.now() },
				consentTypes: [
					{
						defaultValue: true,
						description: 'Necessary',
						disabled: true,
						display: true,
						gdprType: 1,

						name: 'necessary',
					},
					{
						defaultValue: false,
						description: 'Marketing',
						disabled: false,
						display: true,
						gdprType: 5,

						name: 'marketing',
					},
				],
				consents: {
					marketing: true,
					necessary: true,
				},
				locationInfo: { jurisdiction: 'GDPR' },
				model: 'opt-in',
				reloadOnConsentRevoked: true,
				selectedConsents: {
					marketing: false,
					necessary: true,
				},
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
			});

			await saveConsents({
				get: mockGet,
				manager: mockManager,
				options: { uiSource: 'dialog' },
				set: mockSet,
				type: 'custom',
			});

			// Verify uiSource is stored in pending sync
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				PENDING_CONSENT_SYNC_KEY,
				expect.any(String)
			);

			const pendingSyncCall = (
				mockLocalStorage.setItem as ReturnType<typeof vi.fn>
			).mock.calls.find(([key]) => key === PENDING_CONSENT_SYNC_KEY);
			const storedData = JSON.parse(String(pendingSyncCall?.[1]));
			expect(storedData.uiSource).toBe('dialog');
		});

		it('should omit invalid optional identifiers from pending sync data', async () => {
			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onBeforeConsentRevocationReload: vi.fn(),
					onConsentSet: vi.fn(),
				},
				consentCategories: ['necessary', 'marketing'],
				consentInfo: {
					externalId: 'undefined',
					identityProvider: null,
					subjectId: 'sub_111AEMh5qpiLmhEcbnqwrmsB7X',
					time: Date.now(),
				},
				consentTypes: [
					{
						defaultValue: true,
						description: 'Necessary',
						disabled: true,
						display: true,
						gdprType: 1,

						name: 'necessary',
					},
					{
						defaultValue: false,
						description: 'Marketing',
						disabled: false,
						display: true,
						gdprType: 5,

						name: 'marketing',
					},
				],
				consents: {
					marketing: true,
					necessary: true,
				},
				locationInfo: { jurisdiction: 'GDPR' },
				model: 'opt-in',
				reloadOnConsentRevoked: true,
				selectedConsents: {
					marketing: false,
					necessary: true,
				},
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
			});

			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'custom',
			});

			const storedData = JSON.parse(
				(mockLocalStorage.setItem as ReturnType<typeof vi.fn>).mock.calls[0][1]
			);

			expect(storedData.externalId).toBeUndefined();
			expect(storedData.identityProvider).toBeUndefined();
		});

		it('should NOT call API when reload is triggered', async () => {
			mockGet = vi.fn().mockReturnValue({
				callbacks: {
					onConsentSet: vi.fn(),
				},
				consentCategories: ['necessary', 'marketing'],
				consentInfo: { subjectId: 'test-subject', time: Date.now() },
				consentTypes: [
					{
						defaultValue: true,
						description: 'Necessary',
						disabled: true,
						display: true,
						gdprType: 1,

						name: 'necessary',
					},
					{
						defaultValue: false,
						description: 'Marketing',
						disabled: false,
						display: true,
						gdprType: 5,

						name: 'marketing',
					},
				],
				consents: {
					marketing: true,
					necessary: true,
				},
				reloadOnConsentRevoked: true,
				selectedConsents: {
					marketing: false,
					necessary: true,
				},
				updateIframeConsents: vi.fn(),
				updateNetworkBlockerConsents: vi.fn(),
				updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
			});

			await saveConsents({
				get: mockGet,
				manager: mockManager,
				set: mockSet,
				type: 'custom',
			});

			// API should NOT be called when reload is triggered
			// (sync happens after reload)
			expect(mockManager.setConsent).not.toHaveBeenCalled();
		});
	});
});
