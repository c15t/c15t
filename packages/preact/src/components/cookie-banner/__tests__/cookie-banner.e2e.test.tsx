import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-preact';
import { ConsentManagerDialog } from '~/components/consent-manager-dialog/consent-manager-dialog';
import {
	ConsentManagerProvider,
	clearConsentManagerCache,
} from '~/providers/consent-manager-provider';
import type { ConsentManagerOptions } from '~/types/consent-manager';
import { CookieBanner } from '../cookie-banner';

// Create a mutable showPopup value we can control
let mockShowPopup = true;
let mockIsPrivacyDialogOpen = false;

vi.mock('~/hooks/use-consent-manager', async (importOriginal) => {
	const realModule =
		await importOriginal<typeof import('~/hooks/use-consent-manager')>();
	return {
		useConsentManager: () => ({
			...realModule.useConsentManager(),
			showPopup: mockShowPopup,
			isPrivacyDialogOpen: mockIsPrivacyDialogOpen,
			setShowPopup: (value: boolean) => {
				mockShowPopup = value;
			},
			setIsPrivacyDialogOpen: (value: boolean) => {
				mockIsPrivacyDialogOpen = value;
			},
		}),
	};
});

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
		// Reset showPopup before each test
		mockShowPopup = true;
		mockIsPrivacyDialogOpen = false;
		// Reset all mocks
		vi.clearAllMocks();
		clearConsentManagerCache();
	});

	test('should show cookie banner on first visit', () => {
		render(
			<ConsentManagerProvider options={defaultOptions}>
				<CookieBanner />
				<ConsentManagerDialog />
			</ConsentManagerProvider>
		);

		const element = document.body.querySelector(
			`[data-testid="cookie-banner-root"]`
		);

		expect(element).toBeTruthy();
		expect(mockShowPopup).toBe(true);

		// Verify all essential elements are present
		expect(
			document.querySelector('[data-testid="cookie-banner-title"]')
		).toBeTruthy();
		expect(
			document.querySelector('[data-testid="cookie-banner-description"]')
		).toBeTruthy();
		expect(
			document.querySelector('[data-testid="cookie-banner-reject-button"]')
		).toBeTruthy();
		expect(
			document.querySelector('[data-testid="cookie-banner-customize-button"]')
		).toBeTruthy();
		expect(
			document.querySelector('[data-testid="cookie-banner-accept-button"]')
		).toBeTruthy();
	});

	test('should accept all cookies when clicking Accept All', async () => {
		render(
			<ConsentManagerProvider options={defaultOptions}>
				<CookieBanner />
				<ConsentManagerDialog />
			</ConsentManagerProvider>
		);

		// Click accept all button
		const acceptButton = document.querySelector(
			'[data-testid="cookie-banner-accept-button"]'
		);
		acceptButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		// Banner should disappear
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(mockShowPopup).toBe(false);
		expect(
			document.querySelector('[data-testid="cookie-banner-root"]')
		).toBeFalsy();

		// Check localStorage for consent
		const consent = JSON.parse(
			window.localStorage.getItem('privacy-consent-storage') || '{}'
		);

		expect(consent.consents).toBeTruthy();
		expect(consent.consentInfo.type).toBe('all');
	});

	test('should reject non-essential cookies when clicking Reject All', async () => {
		render(
			<ConsentManagerProvider options={defaultOptions}>
				<CookieBanner />
				<ConsentManagerDialog />
			</ConsentManagerProvider>
		);

		// Click reject all button
		const rejectButton = document.querySelector(
			'[data-testid="cookie-banner-reject-button"]'
		);
		rejectButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		// Banner should disappear
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(mockShowPopup).toBe(false);
		expect(
			document.querySelector('[data-testid="cookie-banner-root"]')
		).toBeFalsy();

		// Check localStorage for consent
		const consent = JSON.parse(
			window.localStorage.getItem('privacy-consent-storage') || '{}'
		);
		expect(consent.consents).toBeTruthy();
		expect(consent.consentInfo.type).toBe('necessary');

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

		// Click customise button
		const customiseButton = document.querySelector(
			'[data-testid="cookie-banner-customize-button"]'
		);
		customiseButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		// Cookie banner should be hidden
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(mockShowPopup).toBe(false);
		expect(
			document.querySelector('[data-testid="cookie-banner-root"]')
		).toBeFalsy();

		// Consent manager dialog should be visible
		expect(mockIsPrivacyDialogOpen).toBe(true);
		const dialog = document.querySelector(
			'[data-testid="consent-manager-dialog-root"]'
		);

		expect(dialog).toBeTruthy();

		// Check for consent type switches
		expect(
			document.querySelector(
				'[data-testid="consent-manager-widget-switch-necessary"]'
			)
		).toBeTruthy();
		expect(
			document.querySelector(
				'[data-testid="consent-manager-widget-switch-marketing"]'
			)
		).toBeTruthy();

		// Save custom preferences
		const marketingSwitch = document.querySelector(
			'[data-testid="consent-manager-widget-switch-marketing"]'
		);
		marketingSwitch?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		const saveButton = document.querySelector(
			'[data-testid="consent-manager-widget-footer-save-button"]'
		);
		saveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		// Dialog should close
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(mockIsPrivacyDialogOpen).toBe(false);

		// Check localStorage for custom consent
		const consent = JSON.parse(
			window.localStorage.getItem('privacy-consent-storage') || '{}'
		);
		expect(consent.consents).toBeTruthy();
		expect(consent.consentInfo.type).toBe('custom');
		expect(consent.consents.marketing).toBe(true);
	});

	test('should be keyboard accessible', () => {
		render(
			<ConsentManagerProvider options={defaultOptions}>
				<CookieBanner />
				<ConsentManagerDialog />
			</ConsentManagerProvider>
		);

		// Focus should start on first interactive element
		const rejectButton = document.querySelector(
			'[data-testid="cookie-banner-reject-button"]'
		) as HTMLElement;
		const customiseButton = document.querySelector(
			'[data-testid="cookie-banner-customize-button"]'
		) as HTMLElement;
		const acceptButton = document.querySelector(
			'[data-testid="cookie-banner-accept-button"]'
		) as HTMLElement;

		// Tab through all buttons
		rejectButton.focus();
		expect(document.activeElement).toBe(rejectButton);

		customiseButton.focus();
		expect(document.activeElement).toBe(customiseButton);

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

		// Check if overlay is present when scrollLock is true
		expect(
			document.querySelector('[data-testid="cookie-banner-overlay"]')
		).toBeTruthy();

		// Accept cookies
		const acceptButton = document.querySelector(
			'[data-testid="cookie-banner-accept-button"]'
		);
		acceptButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		// Overlay should be removed
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(
			document.querySelector('[data-testid="cookie-banner-overlay"]')
		).toBeFalsy();
	});
});
