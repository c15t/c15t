import { vi } from 'vitest';
import type { C15TContext } from '~/pkgs/types';

/**
 * Creates a mock context for testing API endpoints
 *
 * @returns A mock C15TContext with default values
 */
export function createMockContext(): C15TContext {
	return {
		version: '1.0.0',
		appName: 'test-app',
		db: {
			setConsent: vi.fn(),
			getConsent: vi.fn(),
			withdrawConsent: vi.fn(),
			verifyConsent: vi.fn(),
			getConsentHistory: vi.fn(),
			getConsentPolicy: vi.fn(),
			generateConsentReceipt: vi.fn(),
		},
		registry: {
			findConsents: vi.fn().mockResolvedValue({
				success: true,
				data: {
					consents: [
						{
							id: 'test-consent-id',
							domainId: 'example.com',
							status: 'active',
							givenAt: new Date().toISOString(),
							consentWithdrawals: [],
							records: [],
						},
					],
					auditLogs: [],
					pagination: { total: 1, offset: 0, limit: 100 },
				},
			}),
			findConsentWithdrawals: vi.fn().mockResolvedValue({
				success: true,
				data: {
					consentWithdrawals: [],
					auditLogs: [],
					pagination: { total: 0, offset: 0, limit: 100 },
				},
			}),
			findPolicies: vi.fn().mockResolvedValue({
				success: true,
				data: {
					policies: [],
					auditLogs: [],
					pagination: { total: 0, offset: 0, limit: 100 },
				},
			}),
			findDomains: vi.fn().mockResolvedValue({
				success: true,
				data: {
					domains: [],
					auditLogs: [],
					pagination: { total: 0, offset: 0, limit: 100 },
				},
			}),
			//@ts-expect-error
			findJurisdictions: vi.fn().mockResolvedValue({
				success: true,
				data: {
					jurisdictions: [],
					auditLogs: [],
					pagination: { total: 0, offset: 0, limit: 100 },
				},
			}),
			createConsent: vi.fn(),
			createConsentWithdrawal: vi.fn(),
			createDomain: vi.fn(),
			updateConsent: vi.fn(),
			updateWithdrawal: vi.fn(),
			updateDomain: vi.fn(),
			getConsent: vi.fn().mockResolvedValue({
				success: true,
				data: {
					id: 'test-consent-id',
					subjectId: 'test-subject',
					domainId: 'example.com',
					status: 'active',
					givenAt: new Date().toISOString(),
					preferences: {
						marketing: 'granted',
						analytics: 'granted',
						preferences: 'granted',
					},
				},
			}),
			getWithdrawal: vi.fn(),
			getPolicy: vi.fn().mockResolvedValue({
				success: true,
				data: {
					id: 'test-policy-id',
					domain: 'example.com',
					version: '1.0',
					content: 'Test policy content',
					availablePreferences: {
						marketing: ['granted', 'denied'],
						analytics: ['granted', 'denied'],
						preferences: ['granted', 'denied'],
					},
					createdAt: new Date().toISOString(),
				},
			}),
			getDomain: vi.fn().mockResolvedValue({
				success: true,
				data: {
					id: 'example.com',
					name: 'Example Domain',
					policyId: 'test-policy-id',
					createdAt: new Date().toISOString(),
				},
			}),
			getJurisdiction: vi.fn().mockResolvedValue({
				success: true,
				data: {
					code: 'EU',
					name: 'European Union',
					requiresConsent: true,
					createdAt: new Date().toISOString(),
				},
			}),
		},
		logger: {
			info: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
			debug: vi.fn(),
			success: vi.fn(),
		},
		options: {
			plugins: [],
			logger: {
				// biome-ignore lint/suspicious/noEmptyBlockStatements: its okay its a test
				info: () => {},
				// biome-ignore lint/suspicious/noEmptyBlockStatements: its okay its a test
				success: () => {},
				// biome-ignore lint/suspicious/noEmptyBlockStatements: its okay its a test
				warn: () => {},
				// biome-ignore lint/suspicious/noEmptyBlockStatements: its okay its a test
				error: () => {},
				// biome-ignore lint/suspicious/noEmptyBlockStatements: its okay its a test
				debug: () => {},
			},
		},
		baseURL: 'http://localhost:3000',
		ipAddress: '127.0.0.1',
	};
}

/**
 * Creates a mock request for testing
 *
 * @param url - The request URL
 * @param method - The HTTP method
 * @param body - Optional request body
 * @returns A mock Request object
 */
export function createMockRequest(
	url: string,
	method = 'GET',
	body?: unknown
): Request {
	return new Request(url, {
		method,
		headers: {
			'Content-Type': 'application/json',
		},
		body: body ? JSON.stringify(body) : undefined,
	});
}

/**
 * Creates a mock response for testing
 *
 * @param status - The HTTP status code
 * @param body - The response body
 * @returns A mock Response object
 */
export function createMockResponse(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json',
		},
	});
}

/**
 * Helper to create a mock consent object
 *
 * @param overrides - Optional overrides for the default consent object
 * @returns A mock consent object
 */
export function createMockConsent(
	overrides: Partial<{
		subjectId: string;
		domain: string;
		preferences: Record<string, string>;
		status: string;
		givenAt: string;
	}> = {}
) {
	return {
		subjectId: 'test-subject',
		domain: 'example.com',
		preferences: {
			marketing: 'granted',
			analytics: 'granted',
			preferences: 'granted',
		},
		status: 'active',
		givenAt: new Date().toISOString(),
		...overrides,
	};
}

/**
 * Helper to create a mock consent policy
 *
 * @param overrides - Optional overrides for the default policy object
 * @returns A mock consent policy object
 */
export function createMockPolicy(
	overrides: Partial<{
		id: string;
		domain: string;
		version: string;
		content: string;
		availablePreferences: Record<string, string[]>;
		createdAt: string;
	}> = {}
) {
	return {
		id: 'test-policy-id',
		domain: 'example.com',
		version: '1.0',
		content: 'Test policy content',
		availablePreferences: {
			marketing: ['granted', 'denied'],
			analytics: ['granted', 'denied'],
			preferences: ['granted', 'denied'],
		},
		createdAt: new Date().toISOString(),
		...overrides,
	};
}
