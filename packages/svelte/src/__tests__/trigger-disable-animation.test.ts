import { custom } from '@c15t/core';
import { render, waitFor } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';

import type { ConsentManagerOptions } from '../lib/types';
import Fixture from './fixtures/panel-trigger-fixture.svelte';
import { policyFixture } from './policy-fixture';

describe('ConsentDialogTrigger disableAnimation', () => {
	test.each([true, false])(
		'marks the trigger for the stylesheet when disableAnimation is %s',
		async (disableAnimation) => {
			render(Fixture, {
				options: {
					disableAnimation,
					mode: custom({}),
					persistence: false,
					prefetch: policyFixture(),
				} as ConsentManagerOptions,
			});
			await waitFor(() =>
				expect(
					document.querySelector('[data-testid="consent-dialog-trigger"]')
				).not.toBeNull()
			);
			// The stylesheet stops the hover and snap transitions on it.
			expect(
				document
					.querySelector('[data-testid="consent-dialog-trigger"]')
					?.hasAttribute('data-disable-animation')
			).toBe(disableAnimation);
		}
	);
});
