/**
 * The banner root is a fixed box wider than the card it shows: the floating
 * variant pads it, and the bar's card shell runs full width beside the
 * branding tag. Clicks on that empty space reach the page unless the banner
 * blocks. A full-viewport page button sits behind the banner, so any point
 * the banner does not catch lands on it.
 */
import type { ComponentProps, ReactNode } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { ConsentBanner } from '~/components/prompt';
import { offline } from '~/transports/offline';

const mount = (children: ReactNode) =>
	render(
		<ConsentProvider
			options={{
				mode: offline({ acknowledgeNoRecords: true }),
				persistence: false,
				prefetch: policyFixture(undefined, { id: 'banner-hit-area-test' }),
			}}
		>
			<button
				type="button"
				data-testid="page"
				style={{ inset: 0, position: 'fixed', zIndex: 0 }}
			>
				Page
			</button>
			{children}
		</ConsentProvider>
	);

const mountBanner = (props: ComponentProps<typeof ConsentBanner> = {}) =>
	mount(
		<ConsentBanner
			disableAnimation
			{...props}
		/>
	);

const rect = (testId: string) => {
	const element = document.querySelector(`[data-testid="${testId}"]`);
	if (!element) {
		throw new Error(`Missing ${testId}`);
	}
	return element.getBoundingClientRect();
};

const waitForCard = () =>
	vi.waitFor(
		() => expect(rect('consent-banner-card').height).toBeGreaterThan(0),
		{
			timeout: 3000,
		}
	);

/** The test ID of the nearest element at a point, or its tag name. */
const hit = (x: number, y: number) => {
	const element = document.elementFromPoint(x, y);
	return (
		element?.closest<HTMLElement>('[data-testid]')?.dataset.testid ??
		element?.tagName
	);
};

/** A point on the bar's card shell, beside the branding tag. */
const besideTag = () => {
	const tag = rect('consent-banner-branding');
	return [tag.left / 2, tag.top + tag.height / 2] as const;
};

afterEach(() => {
	document.documentElement.style.removeProperty('--consent-banner-z-index');
});

describe('banner hit area', () => {
	test('clicks beside the bar branding tag reach the page', async () => {
		await mountBanner({ variant: 'bar' });
		await waitForCard();

		expect(hit(...besideTag())).toBe('page');
	});

	test('the branding tag and the card still take clicks', async () => {
		await mountBanner({ variant: 'bar' });
		await waitForCard();
		const tag = rect('consent-banner-branding');
		const card = rect('consent-banner-card');

		expect(hit(tag.left + tag.width / 2, tag.top + tag.height / 2)).toBe(
			'consent-banner-branding'
		);
		expect(hit(card.left + 4, card.top + card.height / 2)).not.toBe('page');
	});

	test("clicks on the floating banner's padding reach the page", async () => {
		await mountBanner();
		await waitForCard();
		const root = rect('consent-banner-root');
		const card = rect('consent-banner-card');

		expect(root.bottom - card.bottom).toBeGreaterThan(4);
		expect(hit(card.left + card.width / 2, card.bottom + 2)).toBe('page');
	});

	test('a blocking banner catches clicks beside the tag', async () => {
		await mountBanner({ blocking: true, variant: 'bar' });
		await waitForCard();

		expect(hit(...besideTag())).not.toBe('page');
	});

	test('a card composed straight into the root takes clicks', async () => {
		await mount(
			<ConsentBanner.Root>
				<ConsentBanner.Card>
					<ConsentBanner.Footer>
						<ConsentBanner.AcceptButton />
					</ConsentBanner.Footer>
				</ConsentBanner.Card>
			</ConsentBanner.Root>
		);
		await waitForCard();
		const card = rect('consent-banner-card');

		expect(hit(card.left + 4, card.top + 4)).not.toBe('page');
	});

	test('--consent-banner-z-index sets the stacking order', async () => {
		document.documentElement.style.setProperty(
			'--consent-banner-z-index',
			'40'
		);
		await mountBanner();
		await waitForCard();

		const root = document.querySelector('[data-testid="consent-banner-root"]');
		expect(root && getComputedStyle(root).zIndex).toBe('40');
	});
});
