/**
 * `ConsentGate`'s default placeholder follows the same rules as React's
 * `useConsentGate` and Vue's gate: a strict policy that leaves the
 * category out says so and offers no button, and the gate registers its
 * category so the preferences list it.
 */
import { custom } from '@c15t/core';
import type { AllConsentNames, ConsentKernel } from '@c15t/core';
import type { PolicyRule } from '@c15t/schema/types';
import { render, waitFor } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';

import type { ConsentManagerOptions } from '../lib/types';
import Fixture from './fixtures/consent-gate-fixture.svelte';
import { policyFixture } from './policy-fixture';

const renderGate = async function renderGate(
	category: AllConsentNames,
	rule: Partial<PolicyRule> = {}
): Promise<ConsentKernel> {
	let captured: ConsentKernel | undefined;
	render(Fixture, {
		category,
		onKernel: (kernel: ConsentKernel) => {
			captured = kernel;
		},
		options: {
			consentCategories: ['necessary'],
			mode: custom({}),
			persistence: false,
			prefetch: policyFixture({}, rule),
		} as ConsentManagerOptions,
	});
	await waitFor(() => {
		expect(
			document.querySelector('[data-testid="consent-gate-placeholder"]')
		).not.toBeNull();
	});
	if (!captured) {
		throw new Error('The provider did not render');
	}
	return captured;
};

const title = (): string | null | undefined =>
	document.querySelector('[data-testid="consent-gate-title"]')?.textContent;

const button = (): Element | null =>
	document.querySelector('[data-testid="consent-gate-button"]');

describe('ConsentGate in Svelte', () => {
	test('a strict policy without the category says so and offers no button', async () => {
		await renderGate('marketing', {
			categories: ['measurement'],
			scopeMode: 'strict',
		});
		expect(title()?.trim()).toBe(
			"This content is unavailable under your region's consent policy."
		);
		expect(button()).toBeNull();
	});

	test('a category inside a strict scope shows the grant button', async () => {
		await renderGate('marketing', {
			categories: ['marketing'],
			scopeMode: 'strict',
		});
		expect(title()?.trim()).toBe(
			'Accept Marketing consent to view this content.'
		);
		expect(button()).not.toBeNull();
	});

	test('registers its category with the provider', async () => {
		const kernel = await renderGate('experience');
		await waitFor(() => {
			expect(kernel.getSnapshot().consentCategories).toContain('experience');
		});
	});
});
