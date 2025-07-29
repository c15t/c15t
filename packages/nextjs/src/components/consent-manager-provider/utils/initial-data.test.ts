import type { ContractsOutputs } from '@c15t/backend/contracts';
import {
	type Mock,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';
import { extractRelevantHeaders } from './headers';
import { getC15TInitialData } from './initial-data';
import { normalizeBackendURL } from './normalize-url';

type ShowConsentBanner = ContractsOutputs['consent']['showBanner'];

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
		cookie: 'test=123',
	};

	const mockHeaders = new Headers({
		'x-forwarded-proto': 'https',
		'x-forwarded-host': 'example.com',
		cookie: 'test=123',
	});

	const mockFetch = vi.fn();

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

	it('should successfully fetch and return consent banner data', async () => {
		const mockResponse: ShowConsentBanner = {
			showConsentBanner: true,
			jurisdiction: {
				message: 'Please accept cookies',
				code: 'GDPR',
			},
			location: {
				countryCode: 'US',
				regionCode: 'CA',
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
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(mockResponse),
		});

		const result = await getC15TInitialData('https://example.com', mockHeaders);

		expect(mockFetch).toHaveBeenCalledWith(
			'https://api.example.com/show-consent-banner',
			{
				method: 'GET',
				headers: mockRelevantHeaders,
			}
		);
		expect(result).toEqual(mockResponse);
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
});
