import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from 'vitest';
import { createTrackingBlocker } from '../tracking-blocker';

const BLOCKED_CONSENT = {
	experience: false,
	functionality: false,
	marketing: false,
	measurement: false,
	necessary: true,
};

const ALLOWED_CONSENT = {
	...BLOCKED_CONSENT,
	measurement: true,
};

describe('TrackingBlocker', () => {
	// Store original globals
	const originalFetch = global.fetch;
	const originalXHR = global.XMLHttpRequest;

	// Set up test environment before all tests
	beforeAll(() => {
		// Mock fetch to simulate a successful response
		global.fetch = vi
			.fn()
			.mockImplementation(() => Promise.resolve(new Response()));

		// We'll use the real XMLHttpRequest instead of mocking it
		if (!global.XMLHttpRequest) {
			global.XMLHttpRequest = originalXHR;
		}
	});

	// Clean up test environment after all tests
	afterAll(() => {
		// Restore globals
		global.fetch = originalFetch;
		global.XMLHttpRequest = originalXHR;
	});

	beforeEach(() => {
		// Reset all mocks and spies
		vi.clearAllMocks();
		vi.restoreAllMocks();

		// Reset fetch to a fresh mock for each test
		global.fetch = vi
			.fn()
			.mockImplementation(() => Promise.resolve(new Response()));
		window.fetch = global.fetch;

		// Reset XMLHttpRequest to original
		window.XMLHttpRequest = originalXHR;

		// Mock document.dispatchEvent since it's not included in the global setup
		vi.spyOn(document, 'dispatchEvent');
	});

	test('blocks fetch requests to tracking domains when consent not granted', async () => {
		// Create tracking blocker with default consents (all false except necessary)
		const _trackingBlocker = createTrackingBlocker({}, BLOCKED_CONSENT);

		// Try to fetch from a tracking domain (Google Analytics)
		await expect(
			fetch('https://www.google-analytics.com/analytics.js')
		).rejects.toThrow(
			'Request to https://www.google-analytics.com/analytics.js blocked due to missing consent'
		);

		// Verify blocked event was dispatched
		expect(document.dispatchEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'ConsentBlockedRequest',
				detail: {
					url: 'https://www.google-analytics.com/analytics.js',
				},
			})
		);
	});

	test('blocks XMLHttpRequest to tracking domains when consent not granted', () => {
		// Create tracking blocker with default consents
		const _trackingBlocker = createTrackingBlocker({}, BLOCKED_CONSENT);
		// Create new XMLHttpRequest
		const xhr = new XMLHttpRequest();

		// Try to open request to tracking domain
		expect(() => {
			xhr.open('GET', 'https://www.google-analytics.com/analytics.js');
		}).toThrow(
			'Request to https://www.google-analytics.com/analytics.js blocked due to missing consent'
		);

		// Verify blocked event was dispatched
		expect(document.dispatchEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'ConsentBlockedRequest',
				detail: {
					url: 'https://www.google-analytics.com/analytics.js',
				},
			})
		);
	});

	test('allows fetch requests to tracking domains after consent granted', async () => {
		// Reset fetch to ensure we start with a clean state
		window.fetch = global.fetch;

		// Create tracking blocker with consent granted
		const trackingBlocker = createTrackingBlocker({}, ALLOWED_CONSENT);

		// Create a spy on window.fetch after tracking blocker has overridden it
		const fetchSpy = vi.spyOn(window, 'fetch');

		// Try fetch request - should now be allowed
		await fetch('https://www.google-analytics.com/analytics.js');

		// Verify fetch was called with correct URL
		expect(fetchSpy).toHaveBeenCalledWith(
			'https://www.google-analytics.com/analytics.js'
		);

		// Clean up
		trackingBlocker.destroy();
	});

	test('allows XMLHttpRequest to tracking domains after consent granted', () => {
		// Create tracking blocker with default consents
		const trackingBlocker = createTrackingBlocker({}, ALLOWED_CONSENT);

		// Create new XMLHttpRequest
		const xhr = new XMLHttpRequest();

		// Should not throw error now that consent is granted
		expect(() => {
			xhr.open('GET', 'https://www.google-analytics.com/analytics.js');
		}).not.toThrow();
	});

	test('allows requests to non-tracking domains regardless of consent', async () => {
		const trackingBlocker = createTrackingBlocker({}, BLOCKED_CONSENT);

		// Try fetch to non-tracking domain
		const fetchSpy = vi.spyOn(window, 'fetch');
		await fetch('https://api.example.com/data');
		expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com/data');

		// Try XMLHttpRequest to non-tracking domain
		const xhr = new XMLHttpRequest();
		expect(() => {
			xhr.open('GET', 'https://api.example.com/data');
		}).not.toThrow();
	});

	test('handles custom domain consent map', async () => {
		// Create tracking blocker with custom domain map
		const trackingBlocker = createTrackingBlocker(
			{
				overrideDomainConsentMap: true,
				domainConsentMap: {
					'custom-analytics.example.com': 'measurement',
				},
			},
			BLOCKED_CONSENT
		);

		// Should block request to custom domain
		await expect(
			fetch('https://custom-analytics.example.com/track')
		).rejects.toThrow(
			'Request to https://custom-analytics.example.com/track blocked due to missing consent'
		);

		// Update consent
		trackingBlocker.updateConsents({
			experience: false,
			functionality: false,
			marketing: false,
			measurement: true,
			necessary: true,
		});
		const fetchSpy = vi.spyOn(window, 'fetch');

		// Should now allow request
		await fetch('https://custom-analytics.example.com/track');
		expect(fetchSpy).toHaveBeenCalledWith(
			'https://custom-analytics.example.com/track'
		);
	});

	test('handles subdomains correctly', async () => {
		const trackingBlocker = createTrackingBlocker({}, BLOCKED_CONSENT);

		// Should block request to subdomain of google-analytics.com
		await expect(
			fetch('https://subdomain.google-analytics.com/track')
		).rejects.toThrow(
			'Request to https://subdomain.google-analytics.com/track blocked due to missing consent'
		);
	});

	test('can be disabled via config', async () => {
		// Create tracking blocker with automatic blocking disabled
		const trackingBlocker = createTrackingBlocker(
			{
				disableAutomaticBlocking: true,
			},
			BLOCKED_CONSENT
		);

		// Should allow all requests regardless of consent
		await fetch('https://www.google-analytics.com/analytics.js');
		expect(fetch).toHaveBeenCalledWith(
			'https://www.google-analytics.com/analytics.js'
		);
	});

	test('cleanup restores original fetch and XMLHttpRequest functionality', async () => {
		// Create tracking blocker which should wrap the implementations
		const trackingBlocker = createTrackingBlocker({}, BLOCKED_CONSENT);

		// Verify tracking is active by trying a blocked request
		await expect(
			fetch('https://www.google-analytics.com/analytics.js')
		).rejects.toThrow();

		// Destroy tracking blocker
		trackingBlocker.destroy();

		// After cleanup, the blocked request should work
		await fetch('https://www.google-analytics.com/analytics.js');
		expect(fetch).toHaveBeenCalledWith(
			'https://www.google-analytics.com/analytics.js'
		);

		// Verify XMLHttpRequest also works after cleanup
		const xhr = new XMLHttpRequest();
		expect(() => {
			xhr.open('GET', 'https://www.google-analytics.com/analytics.js');
		}).not.toThrow();
	});

	test('handles multiple concurrent requests correctly', async () => {
		createTrackingBlocker({}, BLOCKED_CONSENT);

		// Create multiple concurrent requests
		const requests = Promise.all([
			expect(
				fetch('https://www.google-analytics.com/analytics.js')
			).rejects.toThrow(),
			expect(
				fetch('https://www.google-analytics.com/collect')
			).rejects.toThrow(),
			fetch('https://api.example.com/data'), // Should succeed
		]);
		await requests;

		// Verify correct number of blocked events
		// 6 blocked events for the 3 requests due to retries
		expect(document.dispatchEvent).toHaveBeenCalledTimes(6);
	});
});
