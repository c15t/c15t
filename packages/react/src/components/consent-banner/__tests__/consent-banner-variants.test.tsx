import type { PolicyRule } from '@c15t/schema/types';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { ConsentBanner } from '~/components/consent-banner';
import { offline } from '~/transports/offline';
import { defaultTranslationConfig } from '~/utils/default-translation-config';

const renderBanner = function renderBanner(
	rule: Partial<PolicyRule>,
	props: ComponentProps<typeof ConsentBanner> = {},
	options: {
		language?: string;
		presentation?: ComponentProps<
			typeof ConsentProvider
		>['options']['presentation'];
	} = {}
) {
	const prefetch = policyFixture(undefined, {
		id: 'banner-variants-test',
		...rule,
	});
	return render(
		<ConsentProvider
			options={{
				mode: offline(),
				persistence: false,
				prefetch: options.language
					? {
							...prefetch,
							initialTranslations: {
								language: options.language,
								translations: defaultTranslationConfig.translations.en as never,
							},
						}
					: prefetch,
				presentation: options.presentation,
			}}
		>
			<ConsentBanner
				disableAnimation
				{...props}
			/>
		</ConsentProvider>
	);
};

const waitForRoot = async function waitForRoot() {
	await vi.waitFor(
		() => {
			expect(
				document.querySelector('[data-testid="consent-banner-root"]')
			).toBeInTheDocument();
		},
		{ timeout: 3000 }
	);
	return document.querySelector<HTMLElement>(
		'[data-testid="consent-banner-root"]'
	) as HTMLElement;
};

const query = function query<Element extends HTMLElement>(testId: string) {
	return document.querySelector<Element>(`[data-testid="${testId}"]`);
};

afterEach(() => {
	document.body.style.overflow = '';
	vi.restoreAllMocks();
});

describe('ConsentBanner variants', () => {
	test('a choice prompt defaults to a floating bottom-left card', async () => {
		await renderBanner({ model: 'opt-in', prompt: 'choice' });
		const root = await waitForRoot();

		expect(root.dataset.variant).toBe('floating');
		expect(root.dataset.position).toBe('bottom-left');
		expect(root.dataset.blocking).toBeUndefined();
		expect(query('consent-banner-overlay')).toBeNull();
	});

	test('a notice defaults to a floating card and never blocks', async () => {
		await renderBanner(
			{ model: 'opt-out', prompt: 'notice' },
			{ blocking: true }
		);
		const root = await waitForRoot();

		expect(root.dataset.variant).toBe('floating');
		expect(root.dataset.position).toBe('bottom-left');
		expect(root.dataset.blocking).toBeUndefined();
		expect(query('consent-banner-overlay')).toBeNull();
		expect(query('consent-banner-card')?.getAttribute('aria-modal')).toBeNull();
	});

	test('a notice renders as a bottom bar when the host asks for one', async () => {
		await renderBanner(
			{ model: 'opt-out', prompt: 'notice' },
			{ variant: 'bar' }
		);
		const root = await waitForRoot();

		expect(root.dataset.variant).toBe('bar');
		expect(root.dataset.position).toBe('bottom');
		expect(root.dataset.blocking).toBeUndefined();
	});

	test('wall blocks: overlay, modal semantics, scroll lock and focus trap', async () => {
		await renderBanner(
			{ model: 'opt-in', prompt: 'choice' },
			{ scrollLock: false, trapFocus: false, variant: 'wall' }
		);
		const root = await waitForRoot();

		expect(root.dataset.variant).toBe('wall');
		expect(root.dataset.position).toBe('center');
		expect(root.dataset.blocking).toBe('true');
		expect(query('consent-banner-overlay')).toBeInTheDocument();
		const card = query('consent-banner-card');
		expect(card?.getAttribute('aria-modal')).toBe('true');
		expect(card?.getAttribute('role')).toBe('dialog');
		await vi.waitFor(() => {
			expect(document.body.style.overflow).toBe('hidden');
			expect(card?.contains(document.activeElement)).toBe(true);
		});
	});

	test('blocking on a floating banner locks scroll and traps focus', async () => {
		await renderBanner(
			{ model: 'opt-in', prompt: 'choice' },
			{ blocking: true, position: 'top-center' }
		);
		const root = await waitForRoot();

		expect(root.dataset.variant).toBe('floating');
		expect(root.dataset.position).toBe('top-center');
		expect(root.dataset.blocking).toBe('true');
		expect(query('consent-banner-overlay')).toBeInTheDocument();
		await vi.waitFor(() => {
			expect(document.body.style.overflow).toBe('hidden');
			expect(
				query('consent-banner-card')?.contains(document.activeElement)
			).toBe(true);
		});
	});

	test('a defaulted corner mirrors for right-to-left text', async () => {
		await renderBanner(
			{ model: 'opt-in', prompt: 'choice' },
			{},
			{
				language: 'he',
			}
		);
		const root = await waitForRoot();

		expect(root.getAttribute('dir')).toBe('rtl');
		expect(root.dataset.position).toBe('bottom-right');
	});

	test('a host-chosen corner is never mirrored', async () => {
		await renderBanner(
			{ model: 'opt-in', prompt: 'choice' },
			{ position: 'bottom-right' },
			{ language: 'he' }
		);
		const root = await waitForRoot();

		expect(root.getAttribute('dir')).toBe('rtl');
		expect(root.dataset.position).toBe('bottom-right');
	});

	test('host presentation sets the variant and a prop overrides it', async () => {
		await renderBanner(
			{ model: 'opt-in', prompt: 'choice' },
			{},
			{
				presentation: { prompt: { position: 'top-left', variant: 'widget' } },
			}
		);
		const root = await waitForRoot();
		expect(root.dataset.variant).toBe('widget');
		expect(root.dataset.position).toBe('top-left');
	});

	test('an invalid position falls back to the variant default with a warning', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		await renderBanner(
			{ model: 'opt-in', prompt: 'choice' },
			{ position: 'bottom-left', variant: 'bar' }
		);
		const root = await waitForRoot();

		expect(root.dataset.variant).toBe('bar');
		expect(root.dataset.position).toBe('bottom');
		await vi.waitFor(() => {
			expect(warn).toHaveBeenCalledWith(
				expect.stringContaining('c15t presentation'),
				expect.anything()
			);
		});
	});
});
