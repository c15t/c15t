import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureConsentManager } from '../client-factory';
import { C15tClient } from '../client-c15t';
import { OfflineClient } from '../client-offline';
import { CustomClient } from '../client-custom';
import { mockLocalStorage, fetchMock } from '../../../vitest.setup';

describe('Client Factory Tests', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		fetchMock.mockReset();
		mockLocalStorage.clear();
	});

	it('should create C15tClient when mode is c15t', () => {
		const client = configureConsentManager({
			mode: 'c15t',
			backendURL: '/api/c15t',
		});

		expect(client).toBeInstanceOf(C15tClient);
	});

	it('should create OfflineClient when mode is offline', () => {
		const client = configureConsentManager({
			mode: 'offline',
		});

		expect(client).toBeInstanceOf(OfflineClient);
	});

	it('should create CustomClient when mode is custom', () => {
		const mockHandlers = {
			showConsentBanner: vi.fn(),
			setConsent: vi.fn(),
			verifyConsent: vi.fn(),
		};

		const client = configureConsentManager({
			mode: 'custom',
			endpointHandlers: mockHandlers,
		});

		expect(client).toBeInstanceOf(CustomClient);
	});

	it('should default to C15tClient when no mode is specified', () => {
		const client = configureConsentManager({
			backendURL: '/api/c15t',
		});

		expect(client).toBeInstanceOf(C15tClient);
	});
});
