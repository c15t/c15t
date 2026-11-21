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

test('sets rel="noopener noreferrer" on default new-tab links and respects overrides', async () => {
	render(Fixture, {
		legalLinks: ['privacyPolicy', 'cookiePolicy', 'termsOfService'],
		options: {
			legalLinks: {
				cookiePolicy: { href: '/cookies', label: 'Cookies', target: '_self' },
				privacyPolicy: { href: '/privacy', label: 'Privacy' },
				termsOfService: { href: '/terms', label: 'Terms', rel: 'noopener' },
			},
			mode: custom({}),
			persistence: false,
			prefetch: policyFixture(),
		} as ConsentManagerOptions,
	});

	const privacy = await waitFor(() => {
		const found = document.querySelector<HTMLAnchorElement>(
			'[data-testid="consent-banner-legal-link-privacyPolicy"]'
		);
		expect(found).not.toBeNull();
		return found as HTMLAnchorElement;
	});
	const cookies = document.querySelector<HTMLAnchorElement>(
		'[data-testid="consent-banner-legal-link-cookiePolicy"]'
	);
	const terms = document.querySelector<HTMLAnchorElement>(
		'[data-testid="consent-banner-legal-link-termsOfService"]'
	);

	expect(privacy.getAttribute('target')).toBe('_blank');
	expect(privacy.getAttribute('rel')).toBe('noopener noreferrer');

	expect(cookies?.getAttribute('target')).toBe('_self');
	expect(cookies?.getAttribute('rel')).toBeNull();

	expect(terms?.getAttribute('target')).toBe('_blank');
	expect(terms?.getAttribute('rel')).toBe('noopener');
});
