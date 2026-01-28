import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMock, mockLocalStorage } from '../../../../vitest.setup';
import { STORAGE_KEY_V2 } from '../../../store/initial-state';
import { configureConsentManager } from '../../client-factory';
import { API_ENDPOINTS } from '../../types';

describe('c15t Client identifyUser Tests', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		fetchMock.mockReset();
		mockLocalStorage.clear();
	});

	it('should call PATCH /subject/:id to link external ID', async () => {
		// Mock successful response
		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					id: 'sub_test123abc',
					externalId: 'user_123',
					identityProvider: 'clerk',
					updatedAt: Date.now(),
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				}
			)
		);

		// Configure the client
		const client = configureConsentManager({
			mode: 'c15t',
			backendURL: '/api/c15t',
		});

		// Call identifyUser
		const response = await client.identifyUser({
			body: {
				id: 'sub_test123abc',
				externalId: 'user_123',
				identityProvider: 'clerk',
			},
		});

		// Assertions
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining(`${API_ENDPOINTS.PATCH_SUBJECT}/sub_test123abc`),
			expect.objectContaining({
				method: 'PATCH',
			})
		);
		expect(response.ok).toBe(true);
		expect(response.data?.externalId).toBe('user_123');
	});

	it('should return error when subject ID is missing', async () => {
		// Configure the client
		const client = configureConsentManager({
			mode: 'c15t',
			backendURL: '/api/c15t',
		});

		// Call identifyUser without subject ID
		const response = await client.identifyUser({
			body: {
				id: '', // Empty ID
				externalId: 'user_123',
			},
		});

		// Assertions - should not make any fetch calls
		expect(fetchMock).not.toHaveBeenCalled();
		expect(response.ok).toBe(false);
		expect(response.error?.code).toBe('MISSING_SUBJECT_ID');
	});

	it('should handle API errors and queue for retry (offline fallback)', async () => {
		// Mock network error
		fetchMock.mockRejectedValueOnce(new Error('Network error'));

		// Configure the client with retries disabled
		const client = configureConsentManager({
			mode: 'c15t',
			backendURL: '/api/c15t',
			retryConfig: {
				maxRetries: 0,
				retryOnNetworkError: false,
			},
		});

		// Spy on console.warn to verify fallback is used
		const consoleWarnSpy = vi.spyOn(console, 'warn');
		const consoleLogSpy = vi.spyOn(console, 'log');

		// Call identifyUser
		const response = await client.identifyUser({
			body: {
				id: 'sub_test123abc',
				externalId: 'user_123',
				identityProvider: 'clerk',
			},
		});

		// Assertions - should use offline fallback
		expect(consoleWarnSpy).toHaveBeenCalled();
		expect(consoleLogSpy).toHaveBeenCalled();
		expect(response.ok).toBe(true); // Optimistic success

		// Check that submission was queued
		const pendingSubmissions = mockLocalStorage.getItem(
			'c15t-pending-identify-submissions'
		);
		expect(pendingSubmissions).toBeTruthy();
		const parsed = JSON.parse(pendingSubmissions || '[]');
		expect(parsed).toHaveLength(1);
		expect(parsed[0].externalId).toBe('user_123');
	});

	it('should save externalId to storage before API call (optimistic update)', async () => {
		// Mock successful response
		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					id: 'sub_test123abc',
					externalId: 'user_123',
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			)
		);

		// Spy on localStorage.setItem
		const setItemSpy = vi.spyOn(mockLocalStorage, 'setItem');

		// Configure the client
		const client = configureConsentManager({
			mode: 'c15t',
			backendURL: '/api/c15t',
		});

		// Call identifyUser
		await client.identifyUser({
			body: {
				id: 'sub_test123abc',
				externalId: 'user_123',
				identityProvider: 'clerk',
			},
		});

		// Storage should be updated with externalId (called at least once)
		expect(setItemSpy).toHaveBeenCalled();

		// Find the call that contains our externalId
		const calls = setItemSpy.mock.calls;
		const hasExternalId = calls.some(
			([key, value]) =>
				key === STORAGE_KEY_V2 &&
				typeof value === 'string' &&
				value.includes('user_123')
		);
		expect(hasExternalId).toBe(true);
	});

	it('should preserve consent when switching accounts', async () => {
		// Mock successful response for account switch
		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					id: 'sub_test123abc',
					externalId: 'user_account_b',
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			)
		);

		// Configure the client
		const client = configureConsentManager({
			mode: 'c15t',
			backendURL: '/api/c15t',
		});

		// Switch to account B
		const response = await client.identifyUser({
			body: {
				id: 'sub_test123abc',
				externalId: 'user_account_b',
				identityProvider: 'clerk',
			},
		});

		// Should successfully update
		expect(response.ok).toBe(true);
		expect(response.data?.externalId).toBe('user_account_b');
	});

	it('should handle 404 API errors gracefully', async () => {
		// Mock error response
		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					message: 'Subject not found',
					code: 'SUBJECT_NOT_FOUND',
				}),
				{
					status: 404,
					statusText: 'Not Found',
				}
			)
		);

		// Configure the client
		const client = configureConsentManager({
			mode: 'c15t',
			backendURL: '/api/c15t',
		});

		// Call identifyUser
		const response = await client.identifyUser({
			body: {
				id: 'sub_nonexistent',
				externalId: 'user_123',
			},
		});

		// Assertions - 404 should use fallback (optimistic)
		expect(response.ok).toBe(true);
	});
});
