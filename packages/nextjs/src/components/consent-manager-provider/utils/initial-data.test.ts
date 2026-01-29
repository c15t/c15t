import type { InitOutput } from 'c15t';
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from 'vitest';
import { extractRelevantHeaders } from './headers';
import { getC15TInitialData } from './initial-data';
import { normalizeBackendURL } from './normalize-url';

type Init = InitOutput;

// Mock next/headers
vi.mock('next/headers', () => ({
	headers: () =>
		new Headers({
			'x-forwarded-proto': 'https',
			'x-forwarded-host': 'example.com',
			cookie: 'test=123',
		}),
}));

// Mock the headers and normalize-url modules
vi.mock('./headers', () => ({
	extractRelevantHeaders: vi.fn(),
}));

vi.mock('./normalize-url', () => ({
	normalizeBackendURL: vi.fn(),
}));

describe('getC15TInitialData', () => {
	const mockRelevantHeaders = {
		'x-forwarded-proto': 'https',
		'x-forwarded-host': 'example.com',
		'x-c15t-country': 'DE',
		cookie: 'test=123',
	};

	const mockHeaders = new Headers({
		'x-forwarded-proto': 'https',
		'x-forwarded-host': 'example.com',
		cookie: 'test=123',
	});

	const mockFetch = vi.fn();

	const mockInitResponse: Init = {
		branding: 'c15t',
		jurisdiction: 'GDPR',
		location: {
			countryCode: 'DE',
			regionCode: null,
		},
		translations: {
			language: 'en',
			translations: {
				common: {
					acceptAll: 'Accept All',
					rejectAll: 'Reject All',
					customize: 'Customize',
					save: 'Save',
				},
				cookieBanner: {
					title: 'Cookie Preferences',
					description: 'We use cookies to improve your experience',
				},
				consentManagerDialog: {
					title: 'Manage Cookie Preferences',
					description: 'Customize your cookie preferences',
				},
				consentTypes: {
					necessary: {
						title: 'Necessary',
						description: 'Required for the website to function',
					},
					experience: {
						title: 'Experience',
						description: 'Enhance your browsing experience',
					},
					functionality: {
						title: 'Functionality',
						description: 'Enable specific functionality',
					},
					marketing: {
						title: 'Marketing',
						description: 'Help us improve our marketing',
					},
					measurement: {
						title: 'Measurement',
						description: 'Help us measure performance',
					},
				},
			},
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset fetch mock
		vi.stubGlobal('fetch', mockFetch);
		// Default mock implementations
		(extractRelevantHeaders as Mock).mockReturnValue(mockRelevantHeaders);
		(normalizeBackendURL as Mock).mockReturnValue('https://api.example.com');
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('should return undefined when normalized URL is not available', async () => {
		(normalizeBackendURL as Mock).mockReturnValue(null);

		const result = await getC15TInitialData('https://example.com', mockHeaders);
		expect(result).toBeUndefined();
	});

	it('should return undefined when no relevant headers are present', async () => {
		(extractRelevantHeaders as Mock).mockReturnValue({});

		const result = await getC15TInitialData('https://example.com', mockHeaders);
		expect(result).toBeUndefined();
	});

	it('should successfully fetch and return init data in SSRInitialData format', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(mockInitResponse),
		});

		const result = await getC15TInitialData('https://example.com', mockHeaders);

		expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/init', {
			method: 'GET',
			headers: mockRelevantHeaders,
		});

		// Should return SSRInitialData format with gvl from init response
		expect(result).toEqual({
			init: mockInitResponse,
			gvl: mockInitResponse.gvl,
		});
	});

	it('should handle fetch failure gracefully', async () => {
		mockFetch.mockRejectedValueOnce(new Error('Network error'));

		const result = await getC15TInitialData('https://example.com', mockHeaders);
		expect(result).toBeUndefined();
	});

	it('should handle non-ok response gracefully', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error',
		});

		const result = await getC15TInitialData('https://example.com', mockHeaders);
		expect(result).toBeUndefined();
	});

	describe('with GVL in init response', () => {
		const mockGVL = {
			gvlSpecificationVersion: 3,
			vendorListVersion: 100,
			tcfPolicyVersion: 4,
			lastUpdated: '2024-01-01T00:00:00Z',
			purposes: {
				1: {
					id: 1,
					name: 'Store information',
					description: 'test',
					illustrations: [],
				},
			},
			specialPurposes: {},
			features: {},
			specialFeatures: {},
			vendors: {
				755: {
					id: 755,
					name: 'Google',
					purposes: [],
					legIntPurposes: [],
					flexiblePurposes: [],
					specialPurposes: [],
					features: [],
					specialFeatures: [],
					cookieMaxAgeSeconds: null,
					usesCookies: true,
					cookieRefresh: false,
					usesNonCookieAccess: false,
					urls: [],
				},
			},
			stacks: {},
			dataCategories: {},
		};

		it('should return GVL from init response when present', async () => {
			const initWithGVL = { ...mockInitResponse, gvl: mockGVL };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(initWithGVL),
			});

			const result = await getC15TInitialData(
				'https://example.com',
				mockHeaders
			);

			// Should only make one fetch call (init includes GVL)
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Should return both init and GVL from init response
			expect(result).toEqual({
				init: initWithGVL,
				gvl: mockGVL,
			});
		});

		it('should return undefined gvl when init response has no GVL', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockInitResponse),
			});

			const result = await getC15TInitialData(
				'https://example.com',
				mockHeaders
			);

			// Should only fetch init
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// gvl should be undefined when not in init response
			expect(result).toEqual({
				init: mockInitResponse,
				gvl: undefined,
			});
		});

		it('should return null gvl when init response has explicit null GVL', async () => {
			const initWithNullGVL = { ...mockInitResponse, gvl: null };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(initWithNullGVL),
			});

			const result = await getC15TInitialData(
				'https://example.com',
				mockHeaders
			);

			expect(result).toEqual({
				init: initWithNullGVL,
				gvl: null,
			});
		});
	});

	describe('with overrides', () => {
		it('should include country override in headers', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockInitResponse),
			});

			await getC15TInitialData('https://example.com', mockHeaders, {
				overrides: { country: 'FR' },
			});

			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/init',
				expect.objectContaining({
					headers: expect.objectContaining({
						'x-c15t-country': 'FR',
					}),
				})
			);
		});

		it('should include region override in headers', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockInitResponse),
			});

			await getC15TInitialData('https://example.com', mockHeaders, {
				overrides: { region: 'CA' },
			});

			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/init',
				expect.objectContaining({
					headers: expect.objectContaining({
						'x-c15t-region': 'CA',
					}),
				})
			);
		});

		it('should include language override in headers', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockInitResponse),
			});

			await getC15TInitialData('https://example.com', mockHeaders, {
				overrides: { language: 'de-DE' },
			});

			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/init',
				expect.objectContaining({
					headers: expect.objectContaining({
						'accept-language': 'de-DE',
					}),
				})
			);
		});
	});
});
