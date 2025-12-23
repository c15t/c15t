import { userEvent } from '@vitest/browser/context';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ConsentManagerDialog } from '~/components/consent-manager-dialog/consent-manager-dialog';
import {
	ConsentManagerProvider,
	clearConsentManagerCache,
} from '~/providers/consent-manager-provider';
import type { ConsentManagerOptions } from '~/types/consent-manager';
import { CookieBanner } from '../cookie-banner';

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value.toString();
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
	};
})();

Object.defineProperty(window, 'localStorage', {
	value: localStorageMock,
});

// Default consent manager options
const defaultOptions: ConsentManagerOptions = {
	mode: 'offline',
};

describe('CookieBanner E2E Tests', () => {
	beforeEach(() => {
		// Clear localStorage before each test
		window.localStorage.clear();
		// Clear cookies
		const cookies = document.cookie.split(';');
		for (const cookie of cookies) {
			const eqPos = cookie.indexOf('=');
			const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
			document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
			document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
		}
		// Reset all mocks
		vi.clearAllMocks();
		clearConsentManagerCache();
	});

	test('should show cookie banner on first visit', async () => {
		render(
			<ConsentManagerProvider options={defaultOptions}>
				<CookieBanner />
				<ConsentManagerDialog />
			</ConsentManagerProvider>
		);

		await vi.waitFor(
			() => {
				const element = document.body.querySelector(
					`[data-testid="cookie-banner-root"]`
				);
				expect(element).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		// Verify all essential elements are present
		expect(
			document.querySelector('[data-testid="cookie-banner-title"]')
		).toBeInTheDocument();
		expect(
			document.querySelector('[data-testid="cookie-banner-description"]')
		).toBeInTheDocument();
		expect(
			document.querySelector('[data-testid="cookie-banner-reject-button"]')
		).toBeInTheDocument();
		expect(
			document.querySelector('[data-testid="cookie-banner-customize-button"]')
		).toBeInTheDocument();
		expect(
			document.querySelector('[data-testid="cookie-banner-accept-button"]')
		).toBeInTheDocument();
	});

	test('should accept all cookies when clicking Accept All', async () => {
		render(
			<ConsentManagerProvider options={defaultOptions}>
				<CookieBanner />
				<ConsentManagerDialog />
			</ConsentManagerProvider>
		);

		// Click accept all button
		const acceptButton = await vi.waitFor(() => {
			const btn = document.querySelector(
				'[data-testid="cookie-banner-accept-button"]'
			);
			if (!btn) throw new Error('Accept button not found');
			return btn;
		});

		await userEvent.click(acceptButton);

		// Banner should disappear
		await vi.waitFor(() => {
			expect(
				document.querySelector('[data-testid="cookie-banner-root"]')
			).not.toBeInTheDocument();
		});

		// Check localStorage for consent
		const consent = JSON.parse(window.localStorage.getItem('c15t') || '{}');

		expect(consent.consents.necessary).toBeTruthy();
		expect(consent.consents.marketing).toBeTruthy();
		expect(consent.consents.experience).toBeFalsy();
	});

	test('should reject non-essential cookies when clicking Reject All', async () => {
		render(
			<ConsentManagerProvider options={defaultOptions}>
				<CookieBanner />
				<ConsentManagerDialog />
			</ConsentManagerProvider>
		);

		// Click reject all button
		const rejectButton = await vi.waitFor(
			() => {
				const btn = document.querySelector(
					'[data-testid="cookie-banner-reject-button"]'
				);
				if (!btn) throw new Error('Reject button not found');
				return btn;
			},
			{ timeout: 2000 }
		);

		await userEvent.click(rejectButton);

		// Banner should disappear
		await vi.waitFor(() => {
			expect(
				document.querySelector('[data-testid="cookie-banner-root"]')
			).not.toBeInTheDocument();
		});

		// Check localStorage for consent
		const consent = JSON.parse(window.localStorage.getItem('c15t') || '{}');
		expect(consent.consents).toBeTruthy();

		// Only necessary cookies should be true
		expect(consent.consents.necessary).toBe(true);
		expect(consent.consents.experience).toBe(false);
		expect(consent.consents.functionality).toBe(false);
		expect(consent.consents.marketing).toBe(false);
		expect(consent.consents.measurement).toBe(false);
	});

	test('should open consent manager dialog when clicking Customize', async () => {
		render(
			<ConsentManagerProvider options={defaultOptions}>
				<CookieBanner />
				<ConsentManagerDialog />
			</ConsentManagerProvider>
		);

		// Click customize button
		const customizeButton = await vi.waitFor(
			() => {
				const btn = document.querySelector(
					'[data-testid="cookie-banner-customize-button"]'
				);
				if (!btn) throw new Error('Customize button not found');
				return btn;
			},
			{ timeout: 2000 }
		);

		await userEvent.click(customizeButton);

		// Cookie banner should be hidden
		await vi.waitFor(() => {
			expect(
				document.querySelector('[data-testid="cookie-banner-root"]')
			).not.toBeInTheDocument();
		});

		// Consent manager dialog should be visible
		await vi.waitFor(
			() => {
				const dialog = document.querySelector(
					'[data-testid="consent-manager-dialog-root"]'
				);
				expect(dialog).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		// Check for consent type switches
		expect(
			document.querySelector(
				'[data-testid="consent-manager-widget-switch-necessary"]'
			)
		).toBeInTheDocument();
		expect(
			document.querySelector(
				'[data-testid="consent-manager-widget-switch-marketing"]'
			)
		).toBeInTheDocument();
	});

	test('should save custom preferences from consent manager dialog', async () => {
		// Render dialog in open state directly
		render(
			<ConsentManagerProvider options={defaultOptions}>
				<ConsentManagerDialog open />
			</ConsentManagerProvider>
		);

		await new Promise((resolve) => setTimeout(resolve, 100));

		// Toggle marketing switch
		const marketingSwitch = document.querySelector(
			'[data-testid="consent-manager-widget-switch-marketing"]'
		);
		if (!marketingSwitch) throw new Error('Marketing switch not found');
		await userEvent.click(marketingSwitch);

		const saveButton = document.querySelector(
			'[data-testid="consent-manager-widget-footer-save-button"]'
		);
		if (!saveButton) throw new Error('Save button not found');
		await userEvent.click(saveButton);

		// Dialog should close
		await vi.waitFor(() => {
			expect(
				document.querySelector('[data-testid="consent-manager-dialog-root"]')
			).not.toBeInTheDocument();
		});

		// Check localStorage for custom consent
		const consent = JSON.parse(window.localStorage.getItem('c15t') || '{}');
		expect(consent.consents).toBeTruthy();
		expect(consent.consents.marketing).toBe(true);
	});

	test('should be keyboard accessible', async () => {
		render(
			<ConsentManagerProvider options={defaultOptions}>
				<CookieBanner />
				<ConsentManagerDialog />
			</ConsentManagerProvider>
		);

		// Wait for banner to appear
		const rejectButton = await vi.waitFor(
			() => {
				const btn = document.querySelector(
					'[data-testid="cookie-banner-reject-button"]'
				) as HTMLElement;
				if (!btn) throw new Error('Reject button not found');
				return btn;
			},
			{ timeout: 2000 }
		);

		const customizeButton = document.querySelector(
			'[data-testid="cookie-banner-customize-button"]'
		) as HTMLElement;
		const acceptButton = document.querySelector(
			'[data-testid="cookie-banner-accept-button"]'
		) as HTMLElement;

		// Tab through all buttons
		rejectButton.focus();
		expect(document.activeElement).toBe(rejectButton);

		customizeButton.focus();
		expect(document.activeElement).toBe(customizeButton);

		acceptButton.focus();
		expect(document.activeElement).toBe(acceptButton);
	});

	test('should handle scroll lock properly', async () => {
		render(
			<ConsentManagerProvider options={defaultOptions}>
				<CookieBanner scrollLock />
				<ConsentManagerDialog />
			</ConsentManagerProvider>
		);

		// Wait for overlay to appear
		await vi.waitFor(
			() => {
				const overlay = document.querySelector(
					'[data-testid="cookie-banner-overlay"]'
				);
				expect(overlay).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		// Accept cookies
		const acceptButton = document.querySelector(
			'[data-testid="cookie-banner-accept-button"]'
		);
		if (!acceptButton) throw new Error('Accept button not found');
		await userEvent.click(acceptButton);

		// Overlay should be removed
		await vi.waitFor(() => {
			expect(
				document.querySelector('[data-testid="cookie-banner-overlay"]')
			).not.toBeInTheDocument();
		});
	});
});
