import type { H3Event } from 'h3';
import { vi } from 'vitest';
import type { Route } from '~/routes/types';
import type { getConsentTables } from '~/schema';
import type { C15TContext } from '~/types';
/**
 * Creates a mock context for testing API endpoints
 *
 * @returns A mock C15TContext with default values
 */
export function createMockContext(): C15TContext {
	// Create the base registry with properly typed mock functions
	const mockRegistry = {
		findOrCreateSubject: vi.fn().mockResolvedValue({ id: 'test-subject-id' }),
		findDomain: vi.fn().mockResolvedValue({ id: 'test-domain-id' }),
		findConsentPurposeByCode: vi
			.fn()
			.mockResolvedValue({ id: 'test-purpose-id' }),
		findConsentPolicyById: vi.fn().mockResolvedValue({
			id: 'test-policy-id',
			type: 'privacy_policy',
			isActive: true,
			version: '1.0',
			name: 'Test Policy',
			content: 'Test content',
			contentHash: 'test-hash',
			createdAt: new Date(),
			updatedAt: new Date(),
			effectiveDate: new Date(),
		}),
		findOrCreatePolicy: vi.fn().mockResolvedValue({
			id: 'test-policy-id',
			type: 'privacy_policy',
			isActive: true,
			version: '1.0',
			name: 'Test Policy',
			content: 'Test content',
			contentHash: 'test-hash',
			createdAt: new Date(),
			updatedAt: new Date(),
			effectiveDate: new Date(),
		}),
		createAuditLog: vi.fn().mockResolvedValue(undefined),
		createConsentWithdrawal: vi.fn(),
		findConsentWithdrawals: vi.fn(),
		findConsentWithdrawalById: vi.fn(),
		findConsentWithdrawalsBySubjectId: vi.fn(),
		findConsents: vi.fn(),
		findConsentById: vi.fn(),
		findConsentsBySubjectId: vi.fn(),
		createConsent: vi.fn(),
		updateConsent: vi.fn(),
		findDomains: vi.fn(),
		createDomain: vi.fn(),
		updateDomain: vi.fn(),
		findPolicies: vi.fn(),
		createConsentPolicy: vi.fn().mockResolvedValue({
			id: 'test-policy-id',
			type: 'privacy_policy',
			isActive: true,
			version: '1.0',
			name: 'Test Policy',
			content: 'Test content',
			contentHash: 'test-hash',
			createdAt: new Date(),
			updatedAt: new Date(),
			effectiveDate: new Date(),
		}),
		findJurisdictions: vi.fn(),
		getJurisdiction: vi.fn(),
		findOrCreateJurisdiction: vi.fn(),
		findOrCreateReceipt: vi.fn(),
		createConsentPurpose: vi.fn().mockResolvedValue({
			id: 'test-purpose-id',
			code: 'test-purpose',
			name: 'Test Purpose',
			description: 'Test purpose description',
			isActive: true,
			isEssential: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		}),
		findConsentPurposes: vi.fn(),
		getConsent: vi.fn(),
		getDomain: vi.fn(),
		getPolicy: vi.fn(),
		getWithdrawal: vi.fn(),
		updateWithdrawal: vi.fn(),
		findOrCreateDomain: vi.fn().mockResolvedValue({ id: 'test-domain-id' }),
	};

	// Create the mock adapter
	const mockAdapter = {
		id: 'memory',
		findMany: vi.fn().mockResolvedValue([
			{
				id: 'test-consent-id',
				subjectId: 'test-subject-id',
				policyId: 'test-policy-id',
				purposeIds: ['test-purpose-id'],
				givenAt: new Date().toISOString(),
				status: 'active',
				isActive: true,
			},
		]),
		create: vi.fn().mockImplementation((params) => {
			if (params.model === 'consent') {
				return Promise.resolve({
					id: 'test-consent-id',
					subjectId: params.data.subjectId || 'test-subject-id',
					domainId: params.data.domainId || 'test-domain-id',
					policyId: params.data.policyId || 'test-policy-id',
					purposeIds: params.data.purposeIds || ['test-purpose-id'],
					givenAt: params.data.givenAt || new Date().toISOString(),
					status: params.data.status || 'active',
					isActive:
						params.data.isActive !== undefined ? params.data.isActive : true,
				});
			}
			if (params.model === 'consentRecord') {
				return Promise.resolve({
					id: 'test-record-id',
					consentId: params.data.consentId || 'test-consent-id',
					subjectId: params.data.subjectId || 'test-subject-id',
					actionType: params.data.actionType || 'consent_given',
					createdAt: params.data.createdAt || new Date().toISOString(),
				});
			}
			return Promise.resolve({ id: 'test-id' });
		}),
		findOne: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		count: vi.fn(),
		transaction: vi.fn().mockImplementation(async (opts) => {
			return opts.callback(mockAdapter);
		}),
	};

	// Create the full mock context with all required properties
	return {
		version: '1.0.0',
		appName: 'test-app',
		db: {
			setConsent: vi.fn().mockResolvedValue({
				id: 'test-consent-id',
				type: 'cookie_banner',
				status: 'active',
				subjectId: 'test-subject-id',
				externalSubjectId: undefined,
				domainId: 'test-domain-id',
				domain: 'example.com',
				recordId: 'test-record-id',
				givenAt: new Date().toISOString(),
			}),
			getConsent: vi.fn(),
			withdrawConsent: vi.fn(),
			verifyConsent: vi.fn(),
			getConsentPolicy: vi.fn(),
			generateConsentReceipt: vi.fn(),
		},
		//@ts-expect-error
		registry: mockRegistry as unknown as C15TContext,
		adapter: {
			...mockAdapter,
			updateMany: vi.fn(),
			deleteMany: vi.fn(),
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
				info: vi.fn(),
				success: vi.fn(),
				warn: vi.fn(),
				error: vi.fn(),
				debug: vi.fn(),
			},
		},
		baseURL: 'http://localhost:3000',
		ipAddress: '127.0.0.1',
		// Add missing required C15TContext properties
		tables: {} as ReturnType<typeof getConsentTables>,
		trustedOrigins: ['http://localhost:3000'],
		secret: 'test-secret',
		generateId: vi.fn().mockReturnValue('test-id'),
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

/**
 * Helper function to execute a route handler in tests
 * This simulates the h3 environment for testing routes
 *
 * @param route - The route definition created by defineRoute
 * @param options - Test configuration including context, body, query, params, and headers
 * @returns Promise resolving to the route's response type
 */
export async function executeRoute<ResponseType>(
	route: Route,
	{
		context,
		body,
		query,
		params,
		headers = new Headers(),
	}: {
		context: C15TContext;
		body?: unknown;
		query?: Record<string, string>;
		params?: Record<string, string>;
		headers?: Headers;
	}
): Promise<ResponseType> {
	// If it's a POST/PUT/PATCH request with a body, ensure content-type is set
	if (body && !headers.has('content-type')) {
		headers.set('content-type', 'application/json');
	}

	// Create a minimal mock H3Event with proper context structure
	const mockEvent = {
		context: {
			...context,
			c15t: context,
			query,
			params,
			body,
			validated: {
				body,
				query,
				params,
			},
		},
		node: {
			req: {
				method: body ? 'POST' : 'GET',
				headers: headers,
			},
		},
		headers: {
			get: (name: string) => headers.get(name),
		},
	} as unknown as H3Event;

	// Execute the route handler
	return route.handler(mockEvent) as Promise<ResponseType>;
}
