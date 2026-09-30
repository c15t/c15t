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

	test('marks the overlay and positioner so the open keyframes do not run', async () => {
		render(Fixture, {
			disableAnimation: true,
			options: optionsWith(false),
		});
		await waitFor(() => expect(document.querySelector(ROOT)).not.toBeNull());
		const positioner = document.querySelector(ROOT)?.parentElement;
		const overlay = document.querySelector(
			'[data-testid="consent-dialog-overlay"]'
		);
		// The stylesheet animates both on `data-state` and stops them on
		// `data-disable-animation`, as the Vue and script-tag dialogs set it.
		expect(positioner?.getAttribute('data-state')).toBe('open');
		expect(positioner?.hasAttribute('data-disable-animation')).toBe(true);
		expect(overlay?.getAttribute('data-state')).toBe('open');
		expect(overlay?.hasAttribute('data-disable-animation')).toBe(true);
	});

	test('leaves the open keyframes on by default', async () => {
		render(Fixture, { options: optionsWith(false) });
		await waitFor(() => expect(document.querySelector(ROOT)).not.toBeNull());
		const positioner = document.querySelector(ROOT)?.parentElement;
		expect(positioner?.hasAttribute('data-disable-animation')).toBe(false);
	});
});
