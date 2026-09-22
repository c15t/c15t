/**
 * The preference-item content primitive follows its root's `noStyle`, like
 * the trigger and the React primitive, unless the owning component says
 * otherwise: an explicit `false` keeps the built-in layout under a root
 * that only dropped its own class.
 */
import { render, screen } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';

import PreferenceItemFixture from '../../__tests__/fixtures/preference-item-fixture.svelte';

describe('Svelte preference-item content styling', () => {
	test('a headless root strips the content and the trigger alike', () => {
		render(PreferenceItemFixture);
		expect(screen.getByTestId('headless-trigger').className).toBe('');
		const content = screen.getByTestId('headless-content');
		expect(content.className).toBe('');
		expect(
			content.querySelector('[data-slot="preference-item-content-inner"]')
				?.className
		).toBe('');
	});

	test('an explicit false keeps the content styled under a headless root', () => {
		render(PreferenceItemFixture);
		const content = screen.getByTestId('owned-content');
		expect(content.className).not.toBe('');
		expect(
			content.querySelector('[data-slot="preference-item-content-inner"]')
				?.className
		).not.toBe('');
	});
});
