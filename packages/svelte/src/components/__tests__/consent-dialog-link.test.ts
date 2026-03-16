/**
 * Tests for ConsentDialogLink component.
 *
 * ConsentDialogLink is a thin wrapper around ConsentButton
 * with action="open-consent-dialog" and noStyle=true by default.
 */

import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { clearConsentRuntimeCache } from 'c15t';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import DialogLinkFixture from '../../__tests__/fixtures/DialogLinkFixture.svelte';
import type { ConsentManagerOptions } from '../../types';

const defaultOptions: ConsentManagerOptions = {
	mode: 'offline',
};

describe('ConsentDialogLink', () => {
	beforeEach(() => {
		window.localStorage.clear();
		vi.clearAllMocks();
		clearConsentRuntimeCache();
	});

	test('renders with default data-testid', async () => {
		render(DialogLinkFixture, { options: defaultOptions });

		await waitFor(() => {
			const link = document.querySelector(
				'[data-testid="consent-dialog-link"]'
			);
			expect(link).toBeInTheDocument();
		});
	});

	test('renders children content', async () => {
		render(DialogLinkFixture, { options: defaultOptions });

		await waitFor(() => {
			const link = document.querySelector(
				'[data-testid="consent-dialog-link"]'
			);
			expect(link).toBeInTheDocument();
			expect(link?.textContent).toContain('Manage Preferences');
		});
	});

	test('opens dialog on click', async () => {
		render(DialogLinkFixture, { options: defaultOptions });

		await waitFor(() => {
			const link = document.querySelector(
				'[data-testid="consent-dialog-link"]'
			);
			expect(link).toBeInTheDocument();
		});

		const link = document.querySelector('[data-testid="consent-dialog-link"]')!;
		await fireEvent.click(link);

		await waitFor(() => {
			const dialog = document.querySelector(
				'[data-testid="consent-dialog-root"]'
			);
			expect(dialog).toBeInTheDocument();
		});
	});
});
