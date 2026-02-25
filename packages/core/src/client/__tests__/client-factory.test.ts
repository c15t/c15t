import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMock, mockLocalStorage } from '../../../vitest.setup';
import { configureConsentManager } from '../client-factory';
import { CustomClient } from '../custom';
import { C15tClient } from '../hosted';
import { OfflineClient } from '../offline';

describe('Client Factory Tests', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		fetchMock.mockReset();
		mockLocalStorage.clear();
	});

	it('should create C15tClient when mode is hosted', () => {
		const client = configureConsentManager({
			mode: 'hosted',
			backendURL: '/api/c15t',
		});

		expect(client).toBeInstanceOf(C15tClient);
	});

	it('should create C15tClient when mode is legacy c15t', () => {
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

	it('should default to C15tClient (hosted) when no mode is specified', () => {
		const client = configureConsentManager({
			backendURL: '/api/c15t',
		});

		expect(client).toBeInstanceOf(C15tClient);
	});
});
