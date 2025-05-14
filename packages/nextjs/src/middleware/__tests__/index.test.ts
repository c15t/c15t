import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { c15tMiddleware } from '../index';

// Mock next/headers
vi.mock('next/headers', () => ({
	cookies: vi.fn(),
}));

describe('c15tMiddleware', () => {
	const mockCookieStore = {
		get: vi.fn(),
		set: vi.fn(),
	};

	const mockRequest = {
		headers: {
			get: vi.fn(),
		},
	} as unknown as NextRequest;

	beforeEach(() => {
		vi.clearAllMocks();
		(cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockCookieStore
		);
	});

	it('should not set banner cookie if consent already exists', async () => {
		mockCookieStore.get.mockReturnValue({ value: 'true' });

		await c15tMiddleware(mockRequest);

		expect(mockCookieStore.set).not.toHaveBeenCalled();
	});

	it('should set banner cookie for GDPR jurisdiction when no consent exists', async () => {
		mockCookieStore.get.mockReturnValue(null);
		(mockRequest.headers.get as Mock).mockImplementation((name: string) =>
			name === 'cf-ipcountry' ? 'DE' : null
		);

		await c15tMiddleware(mockRequest);

		expect(mockCookieStore.set).toHaveBeenCalledWith(
			'show-consent-banner',
			JSON.stringify({
				showConsentBanner: true,
				location: {
					countryCode: 'DE',
					regionCode: null,
				},
				jurisdiction: {
					code: 'GDPR',
					message: 'GDPR or equivalent regulations require a cookie banner.',
				},
			})
		);
	});

	it('should set banner cookie for non-regulated jurisdiction when no consent exists', async () => {
		mockCookieStore.get.mockReturnValue(null);
		(mockRequest.headers.get as Mock).mockImplementation((name: string) =>
			name === 'cf-ipcountry' ? 'US' : null
		);

		await c15tMiddleware(mockRequest);

		expect(mockCookieStore.set).toHaveBeenCalledWith(
			'show-consent-banner',
			JSON.stringify({
				showConsentBanner: false,
				location: {
					countryCode: 'US',
					regionCode: null,
				},
				jurisdiction: {
					code: 'NONE',
					message: 'No specific requirements',
				},
			})
		);
	});

	it('should handle missing location headers when no consent exists', async () => {
		mockCookieStore.get.mockReturnValue(null);
		(mockRequest.headers.get as Mock).mockReturnValue(null);

		await c15tMiddleware(mockRequest);

		expect(mockCookieStore.set).toHaveBeenCalledWith(
			'show-consent-banner',
			JSON.stringify({
				showConsentBanner: true,
				location: {
					countryCode: null,
					regionCode: null,
				},
				jurisdiction: {
					code: 'UNKNOWN',
					message: 'No specific requirements',
				},
			})
		);
	});
});
