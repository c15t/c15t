/**
 * E2E tests for activeUI state transitions.
 *
 * Tests that UI visibility is driven by the `activeUI` enum
 * and transitions correctly between 'none', 'banner', and 'dialog'.
 *
 * Mirrors: packages/react/src/components/__tests__/active-ui-transitions.e2e.test.tsx
 */

import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { clearConsentRuntimeCache } from 'c15t';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import BannerDialogFixture from '../../__tests__/fixtures/banner-dialog-fixture.svelte';
import BannerFixture from '../../__tests__/fixtures/banner-fixture.svelte';
import FullFlowFixture from '../../__tests__/fixtures/full-flow-fixture.svelte';
import type { ConsentManagerOptions } from '../../lib/types';

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
		render(BannerFixture, { options: defaultOptions });

		await waitFor(() => {
			const banner = document.querySelector(
				'[data-testid="consent-banner-root"]'
			);
			expect(banner).toBeInTheDocument();
		});
	});

	test('customize transitions banner → dialog', async () => {
		render(BannerDialogFixture, { options: defaultOptions });

		// Wait for banner
		await waitFor(() => {
			const banner = document.querySelector(
				'[data-testid="consent-banner-root"]'
			);
			expect(banner).toBeInTheDocument();
		});

		// Click customize
		const customizeButton = document.querySelector(
			'[data-testid="consent-banner-customize-button"]'
		)!;
		await fireEvent.click(customizeButton);

		// Dialog should open
		await waitFor(() => {
			const dialog = document.querySelector(
				'[data-testid="consent-dialog-root"]'
			);
			expect(dialog).toBeInTheDocument();
		});

		// Banner should be gone (waits for exit animation to complete)
		await waitFor(() => {
			const banner = document.querySelector(
				'[data-testid="consent-banner-root"]'
			);
			expect(banner).not.toBeInTheDocument();
		});
	});

	test('save from dialog hides all UI', async () => {
		render(BannerDialogFixture, { options: defaultOptions });

		// Wait for banner, then click customize
		await waitFor(() => {
			const btn = document.querySelector(
				'[data-testid="consent-banner-customize-button"]'
			);
			expect(btn).toBeInTheDocument();
		});
		const customizeButton = document.querySelector(
			'[data-testid="consent-banner-customize-button"]'
		)!;
		await fireEvent.click(customizeButton);

		// Wait for dialog
		await waitFor(() => {
			const dialog = document.querySelector(
				'[data-testid="consent-dialog-root"]'
			);
			expect(dialog).toBeInTheDocument();
		});

		// Click save in dialog
		const saveButton = document.querySelector(
			'[data-testid="consent-widget-footer-save-button"]'
		)!;
		await fireEvent.click(saveButton);

		// Both banner and dialog should be gone
		await waitFor(() => {
			const banner = document.querySelector(
				'[data-testid="consent-banner-root"]'
			);
			const dialog = document.querySelector(
				'[data-testid="consent-dialog-root"]'
			);
			expect(banner).not.toBeInTheDocument();
			expect(dialog).not.toBeInTheDocument();
		});
	});

	test('banner hidden for returning visitor', async () => {
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

		render(BannerFixture, { options: defaultOptions });

		await new Promise((resolve) => setTimeout(resolve, 500));

		const banner = document.querySelector(
			'[data-testid="consent-banner-root"]'
		);
		expect(banner).not.toBeInTheDocument();
	});

	test('trigger appears after consent, opens dialog on click', async () => {
		render(FullFlowFixture, { options: defaultOptions, showWhen: 'always' });

		// Wait for banner
		await waitFor(() => {
			const btn = document.querySelector(
				'[data-testid="consent-banner-accept-button"]'
			);
			expect(btn).toBeInTheDocument();
		});

		// Accept all
		const acceptButton = document.querySelector(
			'[data-testid="consent-banner-accept-button"]'
		)!;
		await fireEvent.click(acceptButton);

		// Banner should disappear
		await waitFor(() => {
			const banner = document.querySelector(
				'[data-testid="consent-banner-root"]'
			);
			expect(banner).not.toBeInTheDocument();
		});

		// Trigger should appear
		await waitFor(() => {
			const trigger = document.querySelector(
				'button[aria-label="Open privacy settings"]'
			);
			expect(trigger).toBeInTheDocument();
		});

		// Click trigger — dialog should open
		const trigger = document.querySelector(
			'button[aria-label="Open privacy settings"]'
		)!;
		await fireEvent.click(trigger);

		await waitFor(() => {
			const dialog = document.querySelector(
				'[data-testid="consent-dialog-root"]'
			);
			expect(dialog).toBeInTheDocument();
		});
	});

	test('full lifecycle: banner → customize → dialog → save → trigger → dialog', async () => {
		render(FullFlowFixture, { options: defaultOptions, showWhen: 'always' });

		// Step 1: Banner appears
		await waitFor(() => {
			const banner = document.querySelector(
				'[data-testid="consent-banner-root"]'
			);
			expect(banner).toBeInTheDocument();
		});

		// Step 2: Click customize → transitions to dialog
		const customizeButton = document.querySelector(
			'[data-testid="consent-banner-customize-button"]'
		)!;
		await fireEvent.click(customizeButton);

		await waitFor(() => {
			const dialog = document.querySelector(
				'[data-testid="consent-dialog-root"]'
			);
			expect(dialog).toBeInTheDocument();
		});

		// Step 3: Save from dialog → hides everything
		const saveButton = document.querySelector(
			'[data-testid="consent-widget-footer-save-button"]'
		)!;
		await fireEvent.click(saveButton);

		await waitFor(() => {
			const dialog = document.querySelector(
				'[data-testid="consent-dialog-root"]'
			);
			expect(dialog).not.toBeInTheDocument();
		});

		// Step 4: Trigger appears
		await waitFor(() => {
			const trigger = document.querySelector(
				'button[aria-label="Open privacy settings"]'
			);
			expect(trigger).toBeInTheDocument();
		});

		// Step 5: Click trigger → dialog opens again
		const trigger = document.querySelector(
			'button[aria-label="Open privacy settings"]'
		)!;
		await fireEvent.click(trigger);

		await waitFor(() => {
			const dialog = document.querySelector(
				'[data-testid="consent-dialog-root"]'
			);
			expect(dialog).toBeInTheDocument();
		});
	});
});
