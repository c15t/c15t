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

		// Should return SSRInitialData format
		expect(result).toEqual({
			init: mockInitResponse,
			gvl: undefined,
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

	describe('with IAB config', () => {
		const mockGVL = {
			gvlSpecificationVersion: 3,
			vendorListVersion: 100,
			tcfPolicyVersion: 4,
			lastUpdated: '2024-01-01T00:00:00Z',
			purposes: {
				1: { id: 1, name: 'Store information', description: 'test' },
			},
			specialPurposes: {},
			features: {},
			specialFeatures: {},
			vendors: {
				755: { id: 755, name: 'Google' },
			},
			stacks: {},
			dataCategories: {},
		};

		it('should fetch GVL in parallel when IAB is enabled', async () => {
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockInitResponse),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockGVL),
				});

			const result = await getC15TInitialData(
				'https://example.com',
				mockHeaders,
				{
					iab: {
						enabled: true,
						vendors: { 755: 'google' },
					},
				}
			);

			// Should make two fetch calls (init + GVL)
			expect(mockFetch).toHaveBeenCalledTimes(2);

			// Should return both init and GVL
			expect(result).toEqual({
				init: mockInitResponse,
				gvl: mockGVL,
			});
		});

		it('should not fetch GVL when IAB is disabled', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockInitResponse),
			});

			const result = await getC15TInitialData(
				'https://example.com',
				mockHeaders,
				{
					iab: {
						enabled: false,
						vendors: { 755: 'google' },
					},
				}
			);

			// Should only fetch init
			expect(mockFetch).toHaveBeenCalledTimes(1);

			expect(result).toEqual({
				init: mockInitResponse,
				gvl: undefined,
			});
		});

		it('should return null for GVL on 204 response (non-IAB region)', async () => {
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockInitResponse),
				})
				.mockResolvedValueOnce({
					ok: false,
					status: 204,
				});

			const result = await getC15TInitialData(
				'https://example.com',
				mockHeaders,
				{
					iab: {
						enabled: true,
						vendors: { 755: 'google' },
					},
				}
			);

			expect(result).toEqual({
				init: mockInitResponse,
				gvl: null,
			});
		});

		it('should include vendorIds in GVL query params', async () => {
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockInitResponse),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockGVL),
				});

			await getC15TInitialData('https://example.com', mockHeaders, {
				iab: {
					enabled: true,
					vendors: { 1: 'vendor1', 755: 'google' },
				},
			});

			// Check second call (GVL fetch)
			const gvlCall = mockFetch.mock.calls[1];
			expect(gvlCall).toBeDefined();
			if (gvlCall) {
				const gvlCallUrl = gvlCall[0] as string;
				expect(gvlCallUrl).toContain('vendorIds=');
				expect(gvlCallUrl).toMatch(/vendorIds=\d+(,\d+)*/);
			}
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
