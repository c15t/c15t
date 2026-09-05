/**
 * Tests for ConsentDialogLink component.
 *
 * ConsentDialogLink is a thin wrapper around ConsentButton
 * with action="open-consent-dialog" and noStyle=true by default.
 */

import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import DialogLinkFixture from '../../__tests__/fixtures/dialog-link-fixture.svelte';
import { offline } from '../../lib/transports/offline';
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
	mode: offline(),
};

describe('ConsentDialogLink', () => {
	beforeEach(() => {
		window.localStorage.clear();
		vi.clearAllMocks();
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

	test('emits the shared styled-button data contract', async () => {
		render(DialogLinkFixture, { options: defaultOptions, styled: true });

		await waitFor(() => {
			const link = document.querySelector(
				'[data-testid="consent-dialog-link"]'
			);
			expect(link).toHaveAttribute('data-variant', 'neutral');
			expect(link).toHaveAttribute('data-mode', 'stroke');
			expect(link).toHaveAttribute('data-size', 'small');
			expect(link).toHaveAttribute(
				'data-c15t-rights',
				'disclosure preferences'
			);
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

		const link = getDefined(
			document.querySelector('[data-testid="consent-dialog-link"]')
		);
		await Promise.resolve();
		await Promise.resolve();
		await fireEvent.click(link);

		await waitFor(() => {
			const dialog = document.querySelector(
				'[data-testid="consent-dialog-root"]'
			);
			expect(dialog).toBeInTheDocument();
			expect(
				document.querySelector('[data-testid="consent-dialog-branding"]')
			).toHaveAttribute(
				'href',
				`https://c15t.com?ref=${window.location.hostname}`
			);
		});
	});
});
