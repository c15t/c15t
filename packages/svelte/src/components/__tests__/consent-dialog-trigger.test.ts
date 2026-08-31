/**
 * Tests for ConsentDialogTrigger component.
 *
 * Tests visibility logic (showWhen prop), keyboard interaction,
 * and aria attributes.
 */

import { clearConsentRuntimeCache } from '@c15t/core';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createVoidDeferredPromise } from '../../__tests__/deferred-promise';
import FullFlowFixture from '../../__tests__/fixtures/full-flow-fixture.svelte';
import type { ConsentManagerOptions } from '../../lib/types';

const getDefined = <Value>(
	value: Value,
	message = 'Expected value to be defined'
): NonNullable<Value> => {
	if (value === null || value === undefined) {
		throw new Error(message);
	}
	return value;
};

const defaultOptions: ConsentManagerOptions = {
	mode: 'offline',
};

describe('ConsentDialogTrigger', () => {
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

	test('showWhen="never" does not render trigger', async () => {
		render(FullFlowFixture, {
			options: defaultOptions,
			showWhen: 'never',
		});

		// Accept banner first to transition to activeUI='none'
		await waitFor(() => {
			const acceptButton = document.querySelector(
				'[data-testid="consent-banner-accept-button"]'
			);
			expect(acceptButton).toBeInTheDocument();
		});

		const acceptButton = getDefined(
			document.querySelector('[data-testid="consent-banner-accept-button"]')
		);
		await fireEvent.click(acceptButton);

		await waitFor(() => {
			const banner = document.querySelector(
				'[data-testid="consent-banner-root"]'
			);
			expect(banner).not.toBeInTheDocument();
		});

		// Trigger should NOT appear even after consent
		await createVoidDeferredPromise((resolve) => setTimeout(resolve, 300));
		const trigger = document.querySelector(
			'button[aria-label="Open privacy settings"]'
		);
		expect(trigger).not.toBeInTheDocument();
	});

	test('showWhen="after-consent" only shows after consent given', async () => {
		render(FullFlowFixture, {
			options: defaultOptions,
			showWhen: 'after-consent',
		});

		// Banner is showing, trigger should not be visible
		await waitFor(() => {
			const banner = document.querySelector(
				'[data-testid="consent-banner-root"]'
			);
			expect(banner).toBeInTheDocument();
		});

		// No trigger yet (no consent given)
		let trigger = document.querySelector(
			'button[aria-label="Open privacy settings"]'
		);
		expect(trigger).not.toBeInTheDocument();

		// Accept consent
		const acceptButton = getDefined(
			document.querySelector('[data-testid="consent-banner-accept-button"]')
		);
		await fireEvent.click(acceptButton);

		// Now trigger should appear
		await waitFor(() => {
			trigger = document.querySelector(
				'button[aria-label="Open privacy settings"]'
			);
			expect(trigger).toBeInTheDocument();
		});
	});

	test('showWhen="always" shows trigger when activeUI is none', async () => {
		render(FullFlowFixture, {
			options: defaultOptions,
			showWhen: 'always',
		});

		// Accept to dismiss banner
		await waitFor(() => {
			const acceptButton = document.querySelector(
				'[data-testid="consent-banner-accept-button"]'
			);
			expect(acceptButton).toBeInTheDocument();
		});

		const acceptButton = getDefined(
			document.querySelector('[data-testid="consent-banner-accept-button"]')
		);
		await fireEvent.click(acceptButton);

		await waitFor(() => {
			const trigger = document.querySelector(
				'button[aria-label="Open privacy settings"]'
			);
			expect(trigger).toBeInTheDocument();
		});
	});

	test('trigger is hidden while banner is showing', async () => {
		render(FullFlowFixture, {
			options: defaultOptions,
			showWhen: 'always',
		});

		// Banner is visible
		await waitFor(() => {
			const banner = document.querySelector(
				'[data-testid="consent-banner-root"]'
			);
			expect(banner).toBeInTheDocument();
		});

		// Trigger should not be visible while banner is showing
		const trigger = document.querySelector(
			'button[aria-label="Open privacy settings"]'
		);
		expect(trigger).not.toBeInTheDocument();
	});

	test('opens dialog via keyboard Enter key', async () => {
		render(FullFlowFixture, {
			options: defaultOptions,
			showWhen: 'always',
		});

		// Accept to get to trigger state
		await waitFor(() => {
			const acceptButton = document.querySelector(
				'[data-testid="consent-banner-accept-button"]'
			);
			expect(acceptButton).toBeInTheDocument();
		});

		const acceptButton = getDefined(
			document.querySelector('[data-testid="consent-banner-accept-button"]')
		);
		await fireEvent.click(acceptButton);

		// Wait for trigger
		await waitFor(() => {
			const trigger = document.querySelector(
				'button[aria-label="Open privacy settings"]'
			);
			expect(trigger).toBeInTheDocument();
		});

		// Press Enter on trigger
		const trigger = getDefined(
			document.querySelector('button[aria-label="Open privacy settings"]')
		);
		await fireEvent.keyDown(trigger, { key: 'Enter' });

		// Dialog should open
		await waitFor(() => {
			const dialog = document.querySelector(
				'[data-testid="consent-dialog-root"]'
			);
			expect(dialog).toBeInTheDocument();
		});
	});

	test('has correct aria-label', async () => {
		render(FullFlowFixture, {
			options: defaultOptions,
			showWhen: 'always',
		});

		// Accept to get trigger visible
		await waitFor(() => {
			const acceptButton = document.querySelector(
				'[data-testid="consent-banner-accept-button"]'
			);
			expect(acceptButton).toBeInTheDocument();
		});

		const acceptButton = getDefined(
			document.querySelector('[data-testid="consent-banner-accept-button"]')
		);
		await fireEvent.click(acceptButton);

		await waitFor(() => {
			const trigger = document.querySelector(
				'[data-testid="consent-dialog-trigger"]'
			);
			expect(trigger).toBeInTheDocument();
			expect(trigger?.getAttribute('aria-label')).toBe('Open privacy settings');
		});
	});
});
