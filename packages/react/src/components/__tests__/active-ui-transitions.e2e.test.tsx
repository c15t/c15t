/**
 * E2E tests for activeUI state transitions.
 *
 * Tests that UI visibility is driven by the `activeUI` enum
 * and transitions correctly between 'none', 'banner', and 'dialog'.
 *
 * @packageDocumentation
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { ConsentBanner } from '~/components/consent-banner';
import { ConsentDialog } from '~/components/consent-dialog';
import { ConsentDialogTrigger } from '~/components/consent-dialog-trigger';
import {
	ConsentManagerProvider,
	clearConsentRuntimeCache,
} from '~/providers/consent-manager-provider';
import type { ConsentManagerOptions } from '~/types/consent-manager';

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

const defaultOptions: ConsentManagerOptions = {
	mode: 'offline',
};

describe('activeUI Transitions E2E Tests', () => {
	beforeEach(() => {
		window.localStorage.clear();
		const cookies = document.cookie.split(';');
		for (const cookie of cookies) {
			const name = cookie.split('=')[0]?.trim();
			if (name) {
				document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
			}
		}
		vi.clearAllMocks();
		clearConsentRuntimeCache();
	});

	test('banner shows on first visit (activeUI becomes banner)', async () => {
		render(
			<ConsentManagerProvider options={defaultOptions}>
				<ConsentBanner />
			</ConsentManagerProvider>
		);

		await vi.waitFor(
			() => {
				const banner = document.querySelector(
					'[data-testid="consent-banner-root"]'
				);
				expect(banner).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});

	test('customize transitions banner → dialog', async () => {
		render(
			<ConsentManagerProvider options={defaultOptions}>
				<ConsentBanner />
				<ConsentDialog />
			</ConsentManagerProvider>
		);

		// Wait for banner
		await vi.waitFor(
			() => {
				const banner = document.querySelector(
					'[data-testid="consent-banner-root"]'
				);
				expect(banner).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Click customize
		const customizeButton = document.querySelector(
			'[data-testid="consent-banner-customize-button"]'
		);
		await userEvent.click(customizeButton!);

		// Dialog should open
		await vi.waitFor(
			() => {
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(dialog).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Banner should be gone
		const banner = document.querySelector(
			'[data-testid="consent-banner-root"]'
		);
		expect(banner).not.toBeInTheDocument();
	});

	test('save from dialog hides all UI', async () => {
		render(
			<ConsentManagerProvider options={defaultOptions}>
				<ConsentBanner />
				<ConsentDialog />
			</ConsentManagerProvider>
		);

		// Wait for banner, then click customize
		await vi.waitFor(
			() => {
				const btn = document.querySelector(
					'[data-testid="consent-banner-customize-button"]'
				);
				expect(btn).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
		const customizeButton = document.querySelector(
			'[data-testid="consent-banner-customize-button"]'
		);
		await userEvent.click(customizeButton!);

		// Wait for dialog
		await vi.waitFor(
			() => {
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(dialog).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Click save in dialog
		const saveButton = document.querySelector(
			'[data-testid="consent-widget-footer-save-button"]'
		);
		await userEvent.click(saveButton!);

		// Both banner and dialog should be gone
		await vi.waitFor(
			() => {
				const banner = document.querySelector(
					'[data-testid="consent-banner-root"]'
				);
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(banner).not.toBeInTheDocument();
				expect(dialog).not.toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});

	test('banner hidden for returning visitor', async () => {
		// Pre-set localStorage consent
		const consentData = {
			consents: {
				necessary: true,
				functionality: true,
				marketing: true,
				measurement: true,
				experience: true,
			},
			consentInfo: {
				time: Date.now(),
				type: 'accept-all',
			},
		};
		window.localStorage.setItem('c15t', JSON.stringify(consentData));

		render(
			<ConsentManagerProvider options={defaultOptions}>
				<ConsentBanner />
			</ConsentManagerProvider>
		);

		// Wait long enough to confirm banner doesn't appear
		await new Promise((resolve) => setTimeout(resolve, 500));

		const banner = document.querySelector(
			'[data-testid="consent-banner-root"]'
		);
		expect(banner).not.toBeInTheDocument();
	});

	test('trigger appears after consent, opens dialog on click', async () => {
		render(
			<ConsentManagerProvider options={defaultOptions}>
				<ConsentBanner />
				<ConsentDialog />
				<ConsentDialogTrigger showWhen="always" />
			</ConsentManagerProvider>
		);

		// Wait for banner
		await vi.waitFor(
			() => {
				const btn = document.querySelector(
					'[data-testid="consent-banner-accept-button"]'
				);
				expect(btn).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Accept all
		const acceptButton = document.querySelector(
			'[data-testid="consent-banner-accept-button"]'
		);
		await userEvent.click(acceptButton!);

		// Banner should disappear
		await vi.waitFor(
			() => {
				const banner = document.querySelector(
					'[data-testid="consent-banner-root"]'
				);
				expect(banner).not.toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Trigger should appear
		await vi.waitFor(
			() => {
				const trigger = document.querySelector(
					'button[aria-label="Open privacy settings"]'
				);
				expect(trigger).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Click trigger — dialog should open
		const trigger = document.querySelector(
			'button[aria-label="Open privacy settings"]'
		);
		await userEvent.click(trigger!);

		await vi.waitFor(
			() => {
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(dialog).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});

	test('full lifecycle: banner → customize → dialog → save → trigger → dialog', async () => {
		render(
			<ConsentManagerProvider options={defaultOptions}>
				<ConsentBanner />
				<ConsentDialog />
				<ConsentDialogTrigger showWhen="always" />
			</ConsentManagerProvider>
		);

		// Step 1: Banner appears
		await vi.waitFor(
			() => {
				const banner = document.querySelector(
					'[data-testid="consent-banner-root"]'
				);
				expect(banner).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Step 2: Click customize → transitions to dialog
		const customizeButton = document.querySelector(
			'[data-testid="consent-banner-customize-button"]'
		);
		await userEvent.click(customizeButton!);

		await vi.waitFor(
			() => {
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(dialog).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Step 3: Save from dialog → hides everything
		const saveButton = document.querySelector(
			'[data-testid="consent-widget-footer-save-button"]'
		);
		await userEvent.click(saveButton!);

		await vi.waitFor(
			() => {
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(dialog).not.toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Step 4: Trigger appears
		await vi.waitFor(
			() => {
				const trigger = document.querySelector(
					'button[aria-label="Open privacy settings"]'
				);
				expect(trigger).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Step 5: Click trigger → dialog opens again
		const trigger = document.querySelector(
			'button[aria-label="Open privacy settings"]'
		);
		await userEvent.click(trigger!);

		await vi.waitFor(
			() => {
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(dialog).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});
});
