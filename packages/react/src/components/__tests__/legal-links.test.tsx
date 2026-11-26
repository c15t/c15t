import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { InlineLegalLinks } from '~/components/shared/primitives/legal-links';
import { offline } from '~/transports/offline';

describe('InlineLegalLinks', () => {
	test('sets rel="noopener noreferrer" on default new-tab links and respects overrides', async () => {
		const view = await render(
			<ConsentProvider
				options={{
					legalLinks: {
						cookiePolicy: {
							href: '/cookies',
							label: 'Cookies',
							target: '_self',
						},
						privacyPolicy: {
							href: '/privacy',
							label: 'Privacy',
						},
						termsOfService: {
							href: '/terms',
							label: 'Terms',
							rel: 'noopener',
						},
					},
					mode: offline({ acknowledgeNoRecords: true }),
					prefetch: policyFixture(),
				}}
			>
				<InlineLegalLinks
					context="banner"
					links={['privacyPolicy', 'cookiePolicy', 'termsOfService']}
					testIdPrefix="legal-link"
				/>
			</ConsentProvider>
		);

		await vi.waitFor(() => {
			expect(
				document.querySelector('[data-testid="legal-link-privacyPolicy"]')
			).toBeInstanceOf(HTMLAnchorElement);
		});

		const privacy = document.querySelector<HTMLAnchorElement>(
			'[data-testid="legal-link-privacyPolicy"]'
		);
		const cookies = document.querySelector<HTMLAnchorElement>(
			'[data-testid="legal-link-cookiePolicy"]'
		);
		const terms = document.querySelector<HTMLAnchorElement>(
			'[data-testid="legal-link-termsOfService"]'
		);

		expect(privacy?.getAttribute('target')).toBe('_blank');
		expect(privacy?.getAttribute('rel')).toBe('noopener noreferrer');

		expect(cookies?.getAttribute('target')).toBe('_self');
		expect(cookies?.getAttribute('rel')).toBeNull();

		expect(terms?.getAttribute('target')).toBe('_blank');
		expect(terms?.getAttribute('rel')).toBe('noopener');

		view.unmount();
	});
});
