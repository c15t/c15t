import { custom } from '@c15t/core';
import { render, waitFor } from '@testing-library/svelte';
import { expect, test } from 'vitest';

import type { ConsentManagerOptions } from '../lib/types';
import Fixture from './fixtures/legal-links-fixture.svelte';
import { policyFixture } from './policy-fixture';

test('legal links read as a list after the description, as in React', async () => {
	render(Fixture, {
		options: {
			legalLinks: {
				cookiePolicy: { href: '/cookies', label: 'Cookies' },
				privacyPolicy: { href: '/privacy', label: 'Privacy' },
			},
			mode: custom({}),
			persistence: false,
			prefetch: policyFixture(),
		} as ConsentManagerOptions,
	});
	const description = await waitFor(() => {
		const found = document.querySelector(
			'[data-testid="consent-banner-description"]'
		);
		expect(found).not.toBeNull();
		return found as HTMLElement;
	});

	// Ordinary spaces, which collapse into one gap.
	expect(description.textContent).not.toContain(' ');
	expect(description.textContent?.replace(/\s+/gu, ' ').trim()).toBe(
		'Copy. Cookies, Privacy'
	);
});
