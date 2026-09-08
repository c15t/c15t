import type { ConsentPresentation } from '@c15t/core';
import type { ComponentProps } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { ConsentBanner } from '~/components/consent-banner';
import { ConsentDialog } from '~/components/consent-dialog';
import { offline } from '~/transports/offline';

const mount = (
	presentation: ConsentPresentation,
	bannerProps: ComponentProps<typeof ConsentBanner> = {},
	dialog = false
) =>
	render(
		<ConsentProvider
			options={{
				mode: offline(),
				persistence: false,
				prefetch: policyFixture(),
				presentation,
			}}
		>
			<button type="button">Page action</button>
			{dialog ? (
				<ConsentDialog
					open
					disableAnimation
				/>
			) : (
				<ConsentBanner
					disableAnimation
					{...bannerProps}
				/>
			)}
		</ConsentProvider>
	);

describe('presentation behavior', () => {
	test('a non-blocking banner leaves page controls usable', async () => {
		const screen = await mount({
			prompt: { blocking: false, scrollLock: true, trapFocus: true },
		});
		await screen.getByRole('button', { name: 'Page action' }).click();
		expect(document.activeElement).toHaveTextContent('Page action');
		expect(
			document.querySelector('[data-testid="consent-banner-card"]')
		).not.toHaveAttribute('aria-modal');
		expect(
			document.querySelector('[data-testid="consent-banner-overlay"]')
		).toBeNull();
		expect(document.body.style.overflow).not.toBe('hidden');
	});

	test('a non-blocking preference dialog follows provider configuration', async () => {
		const screen = await mount({ preferences: { blocking: false } }, {}, true);
		await expect.element(screen.getByRole('dialog')).toBeVisible();
		expect(
			document.querySelector('[data-testid="consent-dialog-root"]')
		).not.toHaveAttribute('aria-modal');
		expect(
			document.querySelector('[data-testid="consent-dialog-overlay"]')
		).toBeNull();
		expect(document.body.style.overflow).not.toBe('hidden');
		await screen.getByRole('button', { name: 'Page action' }).click();
		expect(document.activeElement).toHaveTextContent('Page action');
	});

	test('a blocking preference dialog ignores contradictory legacy options', async () => {
		const screen = await mount(
			{ preferences: { blocking: true, scrollLock: false, trapFocus: false } },
			{},
			true
		);
		await expect.element(screen.getByRole('dialog')).toBeVisible();
		expect(
			document.querySelector('[data-testid="consent-dialog-root"]')
		).toHaveAttribute('aria-modal', 'true');
		expect(
			document.querySelector('[data-testid="consent-dialog-overlay"]')
		).toBeInTheDocument();
		await vi.waitFor(() => expect(document.body.style.overflow).toBe('hidden'));
	});

	test.each(['widget', 'bar'] as const)(
		'%s descriptions retain long text and the trailing disclosure link',
		async (variant) => {
			await mount(
				{ prompt: { variant } },
				{
					description: (
						<>
							{'A detailed privacy notice. '.repeat(35)}
							<a href="/privacy">Read the full privacy policy</a>
						</>
					),
				}
			);
			await vi.waitFor(() =>
				expect(
					document.querySelector('[data-testid="consent-banner-description"]')
				).toBeInTheDocument()
			);
			const description = document.querySelector<HTMLElement>(
				'[data-testid="consent-banner-description"]'
			);
			expect(description).not.toBeNull();
			if (!description) {
				return;
			}
			expect(getComputedStyle(description).webkitLineClamp).toBe('none');
			expect(description.scrollHeight).toBeLessThanOrEqual(
				description.clientHeight + 1
			);
			const link = description.querySelector('a');
			expect(link?.getBoundingClientRect().bottom).toBeLessThanOrEqual(
				description.getBoundingClientRect().bottom + 1
			);
		}
	);
});
