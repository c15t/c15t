/**
 * A banner composed by hand from `ConsentBanner.*` parts behaves like the
 * stock banner: refs compose with the focus trap, `asChild` swaps the
 * rendered element, and action buttons carry `data-action`.
 */
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { ConsentDialog } from '~/components/panel';
import { ConsentBanner } from '~/components/prompt';
import { offline } from '~/transports/offline';

const renderComposed = function renderComposed(children: ReactNode) {
	return render(
		<ConsentProvider
			options={{
				mode: offline(),
				persistence: false,
				prefetch: policyFixture(undefined, { id: 'banner-compose-test' }),
			}}
		>
			{children}
		</ConsentProvider>
	);
};

const query = function query<Element extends HTMLElement>(testId: string) {
	return document.querySelector<Element>(`[data-testid="${testId}"]`);
};

const waitForTestId = async function waitForTestId(testId: string) {
	await vi.waitFor(() => expect(query(testId)).toBeInTheDocument(), {
		timeout: 3000,
	});
};

describe('composed ConsentBanner', () => {
	test('Card traps focus when given a callback ref', async () => {
		const cardRef = vi.fn();
		await renderComposed(
			<ConsentBanner.Root blocking>
				<ConsentBanner.Card ref={cardRef}>
					<ConsentBanner.Footer>
						<ConsentBanner.RejectButton />
						<ConsentBanner.AcceptButton />
					</ConsentBanner.Footer>
				</ConsentBanner.Card>
			</ConsentBanner.Root>
		);
		await waitForTestId('consent-banner-card');
		const card = query('consent-banner-card');

		expect(cardRef).toHaveBeenCalledWith(card);
		await vi.waitFor(() =>
			expect(card?.contains(document.activeElement)).toBe(true)
		);
	});

	test('Card fills an object ref and still traps focus', async () => {
		const cardRef: { current: HTMLDivElement | null } = { current: null };
		await renderComposed(
			<ConsentBanner.Root blocking>
				<ConsentBanner.Card ref={cardRef}>
					<ConsentBanner.AcceptButton />
				</ConsentBanner.Card>
			</ConsentBanner.Root>
		);
		await waitForTestId('consent-banner-card');

		expect(cardRef.current).toBe(query('consent-banner-card'));
		await vi.waitFor(() =>
			expect(cardRef.current?.contains(document.activeElement)).toBe(true)
		);
	});

	test('Title with asChild renders the child element in place of the h2', async () => {
		await renderComposed(
			<ConsentBanner.Root>
				<ConsentBanner.Card>
					<ConsentBanner.Title
						asChild
						className="custom-title"
					>
						<h3>Cookie choices</h3>
					</ConsentBanner.Title>
				</ConsentBanner.Card>
			</ConsentBanner.Root>
		);
		await waitForTestId('consent-banner-title');
		const title = query('consent-banner-title');

		expect(title?.tagName).toBe('H3');
		expect(title).toHaveTextContent('Cookie choices');
		expect(title?.classList.contains('custom-title')).toBe(true);
		expect(
			document.querySelector('[data-testid="consent-banner-card"] h2')
		).toBeNull();
	});

	test('Title without asChild still renders an h2 with the translated title', async () => {
		await renderComposed(
			<ConsentBanner.Root>
				<ConsentBanner.Card>
					<ConsentBanner.Title />
				</ConsentBanner.Card>
			</ConsentBanner.Root>
		);
		await waitForTestId('consent-banner-title');

		expect(query('consent-banner-title')?.tagName).toBe('H2');
		expect(query('consent-banner-title')?.textContent).not.toBe('');
	});

	test('Overlay with asChild puts the overlay props on the child element', async () => {
		await renderComposed(
			<ConsentBanner.Root blocking>
				<ConsentBanner.Overlay asChild>
					<section data-custom-overlay="" />
				</ConsentBanner.Overlay>
				<ConsentBanner.Card>
					<ConsentBanner.AcceptButton />
				</ConsentBanner.Card>
			</ConsentBanner.Root>
		);
		await waitForTestId('consent-banner-card');
		const overlay = document.querySelector<HTMLElement>(
			'[data-custom-overlay]'
		);

		expect(overlay?.tagName).toBe('SECTION');
		expect(overlay?.getAttribute('aria-hidden')).toBe('true');
		expect(overlay?.className).not.toBe('');
	});

	test('hand-placed action buttons carry data-action like the stock banner', async () => {
		await renderComposed(
			<ConsentBanner.Root>
				<ConsentBanner.Card>
					<ConsentBanner.Footer>
						<ConsentBanner.CustomizeButton />
						<ConsentBanner.RejectButton />
						<ConsentBanner.AcceptButton />
					</ConsentBanner.Footer>
				</ConsentBanner.Card>
			</ConsentBanner.Root>
		);
		await waitForTestId('consent-banner-accept-button');

		expect(query('consent-banner-accept-button')?.dataset.action).toBe(
			'accept'
		);
		expect(query('consent-banner-reject-button')?.dataset.action).toBe(
			'reject'
		);
		expect(query('consent-banner-customize-button')?.dataset.action).toBe(
			'customize'
		);
	});

	test('an explicit data-action on a hand-placed button wins', async () => {
		await renderComposed(
			<ConsentBanner.Root>
				<ConsentBanner.Card>
					<ConsentBanner.AcceptButton data-action="agree" />
				</ConsentBanner.Card>
			</ConsentBanner.Root>
		);
		await waitForTestId('consent-banner-accept-button');

		expect(query('consent-banner-accept-button')?.dataset.action).toBe('agree');
	});

	test('a button with its own click handler opts out of early tap replay', async () => {
		await renderComposed(
			<ConsentBanner.Root>
				<ConsentBanner.Card>
					<ConsentBanner.Footer>
						<ConsentBanner.RejectButton />
						<ConsentBanner.AcceptButton
							onClick={(event) => event.preventDefault()}
						/>
						<ConsentBanner.CustomizeButton performDefaultAction={false} />
					</ConsentBanner.Footer>
				</ConsentBanner.Card>
			</ConsentBanner.Root>
		);
		await waitForTestId('consent-banner-accept-button');

		// The pre-hydration script would replay accept with no veto.
		expect(query('consent-banner-accept-button')?.dataset.earlyTap).toBe('off');
		// Customize opens the dialog whatever the default action says.
		expect(
			query('consent-banner-customize-button')?.dataset.earlyTap
		).toBeUndefined();
		expect(
			query('consent-banner-reject-button')?.dataset.earlyTap
		).toBeUndefined();
	});

	test('asChild and submit buttons opt out of early tap replay', async () => {
		await renderComposed(
			<ConsentBanner.Root>
				<ConsentBanner.Card>
					<ConsentBanner.Footer>
						{/* The link would navigate before the replay records accept. */}
						<ConsentBanner.AcceptButton asChild>
							<a href="#accept">Accept</a>
						</ConsentBanner.AcceptButton>
						<ConsentBanner.RejectButton type="submit" />
					</ConsentBanner.Footer>
				</ConsentBanner.Card>
			</ConsentBanner.Root>
		);
		await waitForTestId('consent-banner-accept-button');

		expect(query('consent-banner-accept-button')?.dataset.earlyTap).toBe('off');
		expect(query('consent-banner-reject-button')?.dataset.earlyTap).toBe('off');
	});
});

describe('composed ConsentDialog', () => {
	test('HeaderTitle with asChild renders the child element in place of the h2', async () => {
		await render(
			<ConsentProvider
				options={{
					initialUI: 'dialog',
					mode: offline(),
					persistence: false,
					prefetch: policyFixture(undefined, { id: 'dialog-compose-test' }),
				}}
			>
				<ConsentDialog.Root>
					<ConsentDialog.Card>
						<ConsentDialog.Header>
							<ConsentDialog.HeaderTitle asChild>
								<h3>Privacy settings</h3>
							</ConsentDialog.HeaderTitle>
						</ConsentDialog.Header>
					</ConsentDialog.Card>
				</ConsentDialog.Root>
			</ConsentProvider>
		);
		await waitForTestId('consent-dialog-title');
		const title = query('consent-dialog-title');

		expect(title?.tagName).toBe('H3');
		expect(title?.id).toBe('consent-dialog-title');
		expect(title).toHaveTextContent('Privacy settings');
	});
});
