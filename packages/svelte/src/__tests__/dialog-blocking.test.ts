import { custom } from '@c15t/core';
import type { ConsentPresentation } from '@c15t/core';
import { render, waitFor } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';

import type { ConsentManagerOptions } from '../lib/types';
import Fixture from './fixtures/dialog-fixture.svelte';
import { policyFixture } from './policy-fixture';

const query = (selector: string) => document.querySelector(selector);

const renderDialog = (
	options: Partial<ConsentManagerOptions> & {
		presentation?: ConsentPresentation;
	} = {}
) =>
	render(Fixture, {
		open: true,
		options: {
			disableAnimation: true,
			mode: custom({}),
			persistence: false,
			prefetch: policyFixture(),
			...options,
		} as ConsentManagerOptions,
	});

describe('consent dialog blocking', () => {
	test('is a blocking modal by default', async () => {
		renderDialog();
		await waitFor(() => {
			expect(query('[data-testid="consent-dialog-root"]')).not.toBeNull();
		});
		const root = query('[data-testid="consent-dialog-root"]');
		expect(root?.getAttribute('aria-modal')).toBe('true');
		expect(root?.getAttribute('data-blocking')).toBe('true');
		expect(query('[data-testid="consent-dialog-overlay"]')).not.toBeNull();
	});

	test('honors an explicit blocking: false', async () => {
		renderDialog({ presentation: { preferences: { blocking: false } } });
		await waitFor(() => {
			expect(query('[data-testid="consent-dialog-root"]')).not.toBeNull();
		});
		const root = query('[data-testid="consent-dialog-root"]');
		expect(root?.getAttribute('aria-modal')).toBeNull();
		expect(root?.getAttribute('data-blocking')).toBeNull();
		expect(query('[data-testid="consent-dialog-overlay"]')).toBeNull();
	});

	test('maps a legacy provider trapFocus: false to non-blocking', async () => {
		renderDialog({ trapFocus: false });
		await waitFor(() => {
			expect(query('[data-testid="consent-dialog-root"]')).not.toBeNull();
		});
		expect(
			query('[data-testid="consent-dialog-root"]')?.getAttribute('aria-modal')
		).toBeNull();
		expect(query('[data-testid="consent-dialog-overlay"]')).toBeNull();
	});

	test('an explicit blocking: true beats a legacy trapFocus: false', async () => {
		renderDialog({
			presentation: { preferences: { blocking: true } },
			trapFocus: false,
		});
		await waitFor(() => {
			expect(query('[data-testid="consent-dialog-root"]')).not.toBeNull();
		});
		expect(
			query('[data-testid="consent-dialog-root"]')?.getAttribute('aria-modal')
		).toBe('true');
		expect(query('[data-testid="consent-dialog-overlay"]')).not.toBeNull();
	});
});
