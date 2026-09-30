import { custom } from '@c15t/core';
import styles from '@c15t/ui/styles/components/consent-dialog';
import { render, waitFor } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';

import type { ConsentManagerOptions } from '../lib/types';
import Fixture from './fixtures/dialog-motion-fixture.svelte';
import { policyFixture } from './policy-fixture';

const ROOT = '[data-testid="consent-dialog-root"]';

const optionsWith = (disableAnimation: boolean) =>
	({
		disableAnimation,
		mode: custom({}),
		persistence: false,
		prefetch: policyFixture(),
	}) as ConsentManagerOptions;

describe('ConsentDialog disableAnimation prop', () => {
	test.each([
		{ expected: false, option: false, prop: undefined },
		{ expected: true, option: false, prop: true },
		{ expected: false, option: true, prop: false },
	])(
		'$prop over provider $option skips the animation: $expected',
		async ({ expected, option, prop }) => {
			render(Fixture, {
				disableAnimation: prop,
				options: optionsWith(option),
			});
			await waitFor(() => expect(document.querySelector(ROOT)).not.toBeNull());
			const root = document.querySelector(ROOT) as HTMLElement;
			expect(root.classList.contains(styles.contentVisible as string)).toBe(
				!expected
			);
		}
	);
});
