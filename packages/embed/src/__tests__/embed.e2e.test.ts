/**
 * End-to-end tests for the @c15t/embed script.
 *
 * Tests the full boot sequence, banner/dialog rendering, and consent flow
 * in a real browser via Vitest + Playwright.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const MOCK_INIT_RESPONSE = {
	showConsentBanner: true,
	jurisdiction: { code: 'GDPR' },
	consentTypes: [
		{
			name: 'necessary',
			title: 'Necessary',
			description: 'Essential cookies',
			disabled: true,
		},
		{
			name: 'measurement',
			title: 'Analytics',
			description: 'Analytics cookies',
			disabled: false,
		},
		{
			name: 'marketing',
			title: 'Marketing',
			description: 'Marketing cookies',
			disabled: false,
		},
	],
	translations: {
		language: 'en',
		translations: {
			cookieBanner: {
				title: 'We value your privacy',
				description: 'This site uses cookies.',
			},
			common: {
				acceptAll: 'Accept All',
				rejectAll: 'Reject All',
				customize: 'Customize',
				save: 'Save Settings',
			},
			consentManagerDialog: {
				title: 'Privacy Settings',
				description: 'Customize your privacy settings.',
			},
		},
	},
};

function setupMockFetch() {
	const mockFetch = vi.fn();
	mockFetch.mockResolvedValue(
		new Response(JSON.stringify(MOCK_INIT_RESPONSE), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		})
	);
	window.fetch = mockFetch;
	return mockFetch;
}

function cleanupDOM() {
	// Remove embed elements
	document
		.querySelectorAll(
			'[data-testid^="consent-"], script[data-backend], #c15t-embed-styles, #c15t-embed-theme'
		)
		.forEach((el) => el.remove());

	// Clean up global state
	// biome-ignore lint/suspicious/noExplicitAny: test cleanup
	delete (window as any).c15tStore;
	// biome-ignore lint/suspicious/noExplicitAny: test cleanup
	delete (window as any).c15tReady;

	// Clear localStorage
	try {
		localStorage.removeItem('c15t');
	} catch {
		// ignore
	}
}

describe('Embed Boot Sequence', () => {
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		cleanupDOM();
		mockFetch = setupMockFetch();
	});

	afterEach(() => {
		cleanupDOM();
		vi.restoreAllMocks();
	});

	it('sets up window.c15tReady as a Promise', async () => {
		const { setupReadyPromise } = await import('../headless');
		const { getOrCreateConsentRuntime, clearConsentRuntimeCache } =
			await import('c15t/runtime');

		clearConsentRuntimeCache();

		const { consentStore } = getOrCreateConsentRuntime(
			{ mode: 'offline' },
			{ pkg: '@c15t/embed', version: 'test' }
		);

		setupReadyPromise(consentStore);

		// biome-ignore lint/suspicious/noExplicitAny: testing window global
		const readyPromise = (window as any).c15tReady;
		expect(readyPromise).toBeInstanceOf(Promise);

		// The store should be available on window.c15tStore
		// biome-ignore lint/suspicious/noExplicitAny: testing window global
		expect((window as any).c15tStore).toBeDefined();
	});
});

describe('Banner Rendering', () => {
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		cleanupDOM();
		mockFetch = setupMockFetch();
	});

	afterEach(() => {
		cleanupDOM();
		vi.restoreAllMocks();
	});

	it('renders banner with correct DOM structure', async () => {
		const { createBanner } = await import('../ui/banner');
		const { getOrCreateConsentRuntime } = await import('c15t/runtime');

		const { consentStore } = getOrCreateConsentRuntime(
			{
				mode: 'offline',
			},
			{ pkg: '@c15t/embed', version: 'test' }
		);

		const banner = createBanner(consentStore);
		document.body.appendChild(banner);

		// Check root structure
		const root = document.querySelector('[data-testid="consent-banner-root"]');
		expect(root).toBeTruthy();

		const card = document.querySelector('[data-testid="consent-banner-card"]');
		expect(card).toBeTruthy();
		expect(card?.getAttribute('role')).toBe('dialog');
		expect(card?.getAttribute('aria-modal')).toBe('true');

		// Check header
		const title = document.querySelector(
			'[data-testid="consent-banner-title"]'
		);
		expect(title?.textContent).toBe('We value your privacy');

		const description = document.querySelector(
			'[data-testid="consent-banner-description"]'
		);
		expect(description?.textContent).toContain('cookies');

		// Check buttons exist
		const acceptBtn = document.querySelector(
			'[data-testid="consent-banner-accept-button"]'
		);
		expect(acceptBtn?.textContent).toBe('Accept All');

		const rejectBtn = document.querySelector(
			'[data-testid="consent-banner-reject-button"]'
		);
		expect(rejectBtn?.textContent).toBe('Reject All');

		const customizeBtn = document.querySelector(
			'[data-testid="consent-banner-customize-button"]'
		);
		expect(customizeBtn?.textContent).toBe('Customize');

		banner.remove();
	});

	it('uses custom translations when provided', async () => {
		const { createBanner } = await import('../ui/banner');
		const { getOrCreateConsentRuntime } = await import('c15t/runtime');

		const { consentStore } = getOrCreateConsentRuntime(
			{ mode: 'offline' },
			{ pkg: '@c15t/embed', version: 'test' }
		);

		const banner = createBanner(consentStore, {
			title: 'Cookie Notice',
			acceptAll: 'Got it',
		});
		document.body.appendChild(banner);

		const title = document.querySelector(
			'[data-testid="consent-banner-title"]'
		);
		expect(title?.textContent).toBe('Cookie Notice');

		const acceptBtn = document.querySelector(
			'[data-testid="consent-banner-accept-button"]'
		);
		expect(acceptBtn?.textContent).toBe('Got it');

		banner.remove();
	});
});

describe('Dialog Rendering', () => {
	beforeEach(() => {
		cleanupDOM();
		setupMockFetch();
	});

	afterEach(() => {
		cleanupDOM();
		vi.restoreAllMocks();
	});

	it('renders dialog with accordion categories', async () => {
		const { createDialog } = await import('../ui/dialog');
		const { getOrCreateConsentRuntime } = await import('c15t/runtime');

		const { consentStore } = getOrCreateConsentRuntime(
			{ mode: 'offline' },
			{ pkg: '@c15t/embed', version: 'test' }
		);

		const { element, destroy } = createDialog(consentStore);
		document.body.appendChild(element);

		// Check dialog structure
		const root = document.querySelector('[data-testid="consent-dialog-root"]');
		expect(root).toBeTruthy();
		expect(root?.tagName).toBe('DIALOG');

		const card = document.querySelector('[data-testid="consent-dialog-card"]');
		expect(card).toBeTruthy();

		// Check title
		const title = document.querySelector(
			'[data-testid="consent-dialog-title"]'
		);
		expect(title?.textContent).toBe('Privacy Settings');

		destroy();
	});

	it('closes on Escape key', async () => {
		const { createDialog } = await import('../ui/dialog');
		const { getOrCreateConsentRuntime } = await import('c15t/runtime');

		const { consentStore } = getOrCreateConsentRuntime(
			{ mode: 'offline' },
			{ pkg: '@c15t/embed', version: 'test' }
		);

		const { element, destroy } = createDialog(consentStore);
		document.body.appendChild(element);

		// Simulate Escape key
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

		// Check that setActiveUI('none') was called
		expect(consentStore.getState().activeUI).toBe('none');

		destroy();
	});
});

describe('Scanner', () => {
	afterEach(() => {
		cleanupDOM();
		document
			.querySelectorAll('c15t-script, [data-c15t-category]')
			.forEach((el) => el.remove());
	});

	it('scans c15t-script custom elements', async () => {
		const { scanDOM } = await import('../scanner');
		const { registerCustomElement } = await import('../custom-element');

		registerCustomElement();

		// Add test elements
		const el = document.createElement('c15t-script');
		el.setAttribute('category', 'measurement');
		el.setAttribute('src', 'https://example.com/analytics.js');
		el.id = 'test-analytics';
		document.body.appendChild(el);

		const scripts = scanDOM();
		expect(scripts.length).toBeGreaterThanOrEqual(1);

		const found = scripts.find((s) => s.id === 'test-analytics');
		expect(found).toBeTruthy();
		expect(found?.category).toBe('measurement');
		expect(found?.src).toBe('https://example.com/analytics.js');

		el.remove();
	});

	it('scans data-c15t-category script elements', async () => {
		const { scanDOM } = await import('../scanner');

		const el = document.createElement('script');
		el.setAttribute('data-c15t-category', 'marketing');
		el.setAttribute('type', 'text/plain');
		el.setAttribute('data-src', 'https://example.com/ads.js');
		el.id = 'test-ads';
		document.body.appendChild(el);

		const scripts = scanDOM();
		const found = scripts.find((s) => s.id === 'test-ads');
		expect(found).toBeTruthy();
		expect(found?.category).toBe('marketing');

		el.remove();
	});
});
