import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { c15tInstance } from './core';
import type { C15TOptions, C15TRequestContext } from './types';

vi.mock('./init', () => ({
	init: () => ({
		appName: 'c15t',
		trustedOrigins: ['https://example.com'],
		logger: {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			success: vi.fn(),
		},
		registry: {},
		db: {},
	}),
}));

const netlifyContext = {
	geo: {
		country: { code: 'US' },
		subdivision: { code: 'CA' },
	},
} satisfies C15TRequestContext;

function createOptions(overrides: Partial<C15TOptions> = {}): C15TOptions {
	return {
		trustedOrigins: ['https://example.com'],
		adapter: {} as C15TOptions['adapter'],
		policyPacks: [
			{
				id: 'us_ca',
				match: { regions: [{ country: 'US', region: 'CA' }] },
				consent: { model: 'opt-out' },
				ui: { mode: 'banner' },
			},
			{
				id: 'eu_gdpr',
				match: { countries: ['DE'] },
				consent: { model: 'opt-in' },
				ui: { mode: 'banner' },
			},
		],
		...overrides,
	};
}

describe('c15tInstance.handler request context', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('accepts runtime-specific second arguments', () => {
		const instance = c15tInstance(createOptions());
		const runtimeHandler: (
			request: Request,
			server: { stop: () => void }
		) => Promise<Response> = instance.handler;
		const requestArgs: Parameters<typeof instance.handler> = [
			new Request('http://localhost/init'),
		];

		expect(runtimeHandler).toBe(instance.handler);
		expect(requestArgs).toHaveLength(1);
	});

	it('resolves Netlify context geo on GET /init without geo headers', async () => {
		const instance = c15tInstance(createOptions());
		const response = await instance.handler(
			new Request('http://localhost/init', {
				headers: { 'accept-language': 'en' },
			}),
			netlifyContext
		);

		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			jurisdiction: string;
			location: { countryCode: string | null; regionCode: string | null };
			policy?: { id?: string };
		};
		expect(body.location).toEqual({ countryCode: 'US', regionCode: 'CA' });
		expect(body.jurisdiction).toBe('CCPA');
		expect(body.policy?.id).toBe('us_ca');
	});

	it('keeps one-argument header-only requests working', async () => {
		const instance = c15tInstance(createOptions());
		const response = await instance.handler(
			new Request('http://localhost/init', {
				headers: {
					'x-c15t-country': 'DE',
					'accept-language': 'en',
				},
			})
		);

		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			jurisdiction: string;
			location: { countryCode: string | null; regionCode: string | null };
			policy?: { id?: string };
		};
		expect(body.location).toEqual({ countryCode: 'DE', regionCode: null });
		expect(body.jurisdiction).toBe('GDPR');
		expect(body.policy?.id).toBe('eu_gdpr');
	});
});
