import type { GlobalVendorList } from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { c15tEdgeInit } from './init-handler';
import type { C15TEdgeOptions } from './types';

const { mockGVLGet, mockResolveInitPayload } = vi.hoisted(() => {
	return {
		mockGVLGet: vi.fn(),
		mockResolveInitPayload: vi.fn(),
	};
});

vi.mock('~/cache/gvl-resolver', () => ({
	createGVLResolver: vi.fn(() => ({
		get: mockGVLGet,
	})),
}));

// Conditionally delegate to the real implementation or throw
const actualResolveInit = await vi.importActual<
	typeof import('~/handlers/init/resolve-init')
>('~/handlers/init/resolve-init');

vi.mock('~/handlers/init/resolve-init', () => ({
	resolveInitPayload: (...args: unknown[]) => {
		if (mockResolveInitPayload.getMockImplementation()) {
			return mockResolveInitPayload(...args);
		}
		return actualResolveInit.resolveInitPayload(
			...(args as Parameters<typeof actualResolveInit.resolveInitPayload>)
		);
	},
}));

const mockGVL: GlobalVendorList = {
	gvlSpecificationVersion: 3,
	vendorListVersion: 123,
	tcfPolicyVersion: 5,
	lastUpdated: '2026-01-01T00:00:00Z',
	purposes: {},
	specialPurposes: {},
	features: {},
	specialFeatures: {},
	vendors: {},
	stacks: {},
};

const baseOptions: C15TEdgeOptions = {
	trustedOrigins: ['https://myapp.com'],
	policyPacks: [
		{
			id: 'policy_eu',
			match: { countries: ['DE', 'FR'] },
			consent: { model: 'opt-in' },
			ui: { mode: 'banner' },
		},
	],
};

function makeRequest(path: string, init?: RequestInit): Request {
	return new Request(`http://localhost${path}`, init);
}

describe('c15tEdgeInit', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGVLGet.mockResolvedValue(mockGVL);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('works without a database adapter', async () => {
		const handler = c15tEdgeInit(baseOptions);
		const response = await handler(
			makeRequest('/', {
				headers: {
					'x-c15t-country': 'DE',
					'accept-language': 'en-US',
				},
			})
		);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.jurisdiction).toBe('GDPR');
		expect(body.location).toEqual({ countryCode: 'DE', regionCode: null });
		expect(body.policy?.model).toBe('opt-in');
	});

	it('returns 204 for CORS preflight', async () => {
		const handler = c15tEdgeInit(baseOptions);
		const response = await handler(
			makeRequest('/', {
				method: 'OPTIONS',
				headers: {
					origin: 'https://myapp.com',
				},
			})
		);

		expect(response.status).toBe(204);
		expect(response.headers.get('access-control-allow-methods')).toBe(
			'GET, OPTIONS'
		);
		expect(response.headers.get('access-control-allow-origin')).toBe(
			'https://myapp.com'
		);
	});

	it('sets CORS headers for trusted origin', async () => {
		const handler = c15tEdgeInit(baseOptions);
		const response = await handler(
			makeRequest('/', {
				headers: {
					origin: 'https://myapp.com',
					'x-c15t-country': 'DE',
					'accept-language': 'en',
				},
			})
		);

		expect(response.status).toBe(200);
		expect(response.headers.get('access-control-allow-origin')).toBe(
			'https://myapp.com'
		);
		expect(response.headers.get('vary')).toBe('Origin');
	});

	it('omits CORS headers for untrusted origin', async () => {
		const handler = c15tEdgeInit(baseOptions);
		const response = await handler(
			makeRequest('/', {
				headers: {
					origin: 'https://evil.com',
					'x-c15t-country': 'DE',
					'accept-language': 'en',
				},
			})
		);

		expect(response.status).toBe(200);
		expect(response.headers.get('access-control-allow-origin')).toBeNull();
	});

	it('omits CORS headers when no origin header is present', async () => {
		const handler = c15tEdgeInit(baseOptions);
		const response = await handler(
			makeRequest('/', {
				headers: {
					'x-c15t-country': 'DE',
					'accept-language': 'en',
				},
			})
		);

		expect(response.status).toBe(200);
		expect(response.headers.get('access-control-allow-origin')).toBeNull();
	});

	it('returns 500 JSON on internal error', async () => {
		mockResolveInitPayload.mockImplementation(() => {
			throw new Error('Something broke');
		});

		const handler = c15tEdgeInit(baseOptions);
		const response = await handler(
			makeRequest('/', {
				headers: {
					'x-c15t-country': 'DE',
					'accept-language': 'en',
				},
			})
		);

		expect(response.status).toBe(500);
		const body = await response.json();
		expect(body.code).toBe('INTERNAL_SERVER_ERROR');

		mockResolveInitPayload.mockReset();
	});

	it('returns no-banner policy for unmatched regions', async () => {
		const handler = c15tEdgeInit(baseOptions);
		const response = await handler(
			makeRequest('/', {
				headers: {
					'x-c15t-country': 'US',
					'accept-language': 'en',
				},
			})
		);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.policy?.model).toBe('none');
		expect(body.policy?.ui?.mode).toBe('none');
	});

	it('returns content-type application/json', async () => {
		const handler = c15tEdgeInit(baseOptions);
		const response = await handler(
			makeRequest('/', {
				headers: {
					'x-c15t-country': 'DE',
					'accept-language': 'en',
				},
			})
		);

		expect(response.headers.get('content-type')).toBe('application/json');
	});
});
