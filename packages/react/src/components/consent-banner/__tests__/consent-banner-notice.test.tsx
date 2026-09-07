import type { PolicyRule } from '@c15t/schema/types';
import type { ComponentProps } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { ConsentBanner } from '~/components/consent-banner';
import { useActiveUI } from '~/hooks';
import { offline } from '~/transports/offline';

const ActiveUIProbe = () => (
	<output data-testid="active-ui">{useActiveUI()}</output>
);

const renderBanner = function renderBanner(
	rule: Partial<PolicyRule>,
	props: ComponentProps<typeof ConsentBanner> = {},
	themeOptions: Partial<ComponentProps<typeof ConsentProvider>['options']> = {}
) {
	return render(
		<ConsentProvider
			options={{
				mode: offline(),
				persistence: false,
				prefetch: policyFixture(undefined, {
					id: 'banner-notice-test',
					...rule,
				}),
				...themeOptions,
			}}
		>
			<ActiveUIProbe />
			<ConsentBanner {...props} />
		</ConsentProvider>
	);
};

const waitForBanner = async function waitForBanner() {
	await vi.waitFor(
		() => {
			expect(
				document.querySelector('[data-testid="consent-banner-root"]')
			).toBeInTheDocument();
		},
		{ timeout: 3000 }
	);
};

const query = function query<Element extends HTMLElement>(testId: string) {
	return document.querySelector<Element>(`[data-testid="${testId}"]`);
};

describe('ConsentBanner notice prompt', () => {
	test('renders a primary Accept All and one neutral opt-out control', async () => {
		await renderBanner({ model: 'opt-out', prompt: 'notice' });
		await waitForBanner();

		const root = query('consent-banner-root');
		expect(root?.dataset.prompt).toBe('notice');
		expect(root?.dataset.model).toBe('opt-out');

		const dismiss = query<HTMLButtonElement>('consent-banner-dismiss-button');
		expect(dismiss).toHaveTextContent('Accept All');
		expect(dismiss?.dataset.action).toBe('dismiss');
		expect(dismiss?.dataset.variant).toBe('primary');
		expect(query('consent-banner-accept-button')).toBeNull();
		expect(query('consent-banner-reject-button')).toBeNull();
		expect(query('consent-banner-customize-button')).toBeNull();

		const controls = Array.from(
			document.querySelectorAll<HTMLButtonElement>(
				'[data-testid="consent-banner-rights"] [data-right]'
			)
		);
		expect(controls.map((control) => control.dataset.right)).toEqual([
			'opt-out',
		]);
		expect(controls[0]).toHaveTextContent('Do not sell or share my data');
		expect(controls[0]?.dataset.action).toBe('right');
		expect(controls[0]?.dataset.variant).toBe('neutral');
		expect(controls[0]?.tagName).toBe('BUTTON');
		expect(controls[0]?.dataset.c15tRights).toContain('opt-out');
		expect(query('consent-banner-right-link-preferences')).toBeNull();

		const footer = query('consent-banner-footer');
		const rights = query('consent-banner-rights');
		const group = query('consent-banner-footer-sub-group');
		expect(footer).toContainElement(rights);
		expect(footer).toContainElement(group);
		const order = Array.from(footer?.children ?? []);
		expect(order.indexOf(rights as Element)).toBeLessThan(
			order.indexOf(group as Element)
		);
	});

	test('uses the notice copy and lets props override it', async () => {
		await renderBanner({ model: 'opt-out', prompt: 'notice' });
		await waitForBanner();

		expect(query('consent-banner-title')).toHaveTextContent('Privacy notice');
		expect(query('consent-banner-description')).toHaveTextContent(
			'You can opt out or manage your preferences at any time.'
		);
		expect(query('consent-banner-card')?.getAttribute('aria-label')).toBe(
			'Privacy notice'
		);
	});

	test('props override the notice copy and dismiss label', async () => {
		await renderBanner(
			{ model: 'opt-out', prompt: 'notice' },
			{
				description: 'Custom description',
				dismissButtonText: 'Got it',
				title: 'Custom title',
			}
		);
		await waitForBanner();

		expect(query('consent-banner-title')).toHaveTextContent('Custom title');
		expect(query('consent-banner-description')).toHaveTextContent(
			'Custom description'
		);
		expect(query('consent-banner-dismiss-button')).toHaveTextContent('Got it');
	});

	test('the opt-out control opens the preference center', async () => {
		const screen = await renderBanner({ model: 'opt-out', prompt: 'notice' });
		await waitForBanner();

		await screen.getByTestId('consent-banner-right-link-opt-out').click();

		await vi.waitFor(() => {
			expect(query('active-ui')).toHaveTextContent('dialog');
		});
	});

	test('honours theme.consentActions.dismiss', async () => {
		await renderBanner(
			{ model: 'opt-out', prompt: 'notice' },
			{},
			{ theme: { consentActions: { dismiss: { mode: 'filled' } } } }
		);
		await waitForBanner();

		const dismiss = query<HTMLButtonElement>('consent-banner-dismiss-button');
		expect(dismiss?.dataset.mode).toBe('filled');
		expect(dismiss?.dataset.variant).toBe('primary');
	});
});

describe('ConsentBanner rights on choice prompts', () => {
	test('renders no rights group when customize covers preferences', async () => {
		await renderBanner({ model: 'opt-in', prompt: 'choice' });
		await waitForBanner();

		const root = query('consent-banner-root');
		expect(root?.dataset.prompt).toBe('choice');
		expect(root?.dataset.model).toBe('opt-in');
		expect(query('consent-banner-title')).toHaveTextContent(
			'We value your privacy'
		);
		expect(query('consent-banner-rights')).toBeNull();
		expect(query('consent-banner-dismiss-button')).toBeNull();
	});

	test('renders a preferences control when the prompt offers only accept and reject', async () => {
		await renderBanner({
			actions: ['accept', 'reject'],
			model: 'opt-in',
			prompt: 'choice',
		});
		await waitForBanner();

		const links = Array.from(
			document.querySelectorAll<HTMLButtonElement>(
				'[data-testid="consent-banner-rights"] [data-right]'
			)
		);
		expect(links.map((link) => link.dataset.right)).toEqual(['preferences']);
		expect(links[0]).toHaveTextContent('Manage preferences');
		expect(links[0]?.dataset.variant).toBe('neutral');
		expect(query('consent-banner-customize-button')).toBeNull();
	});
});
