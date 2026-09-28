/**
 * The banner footer lays out its actions by the card's width, not the
 * viewport's. A host that narrows the card with `--consent-banner-max-width`
 * on a wide screen must get the narrow layout, with every action inside the
 * card, and the default card must keep its single row.
 */
import '@c15t/ui/styles.css';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { ConsentBanner } from '~/components/prompt';
import { offline } from '~/transports/offline';

const renderBanner = async function renderBanner() {
	await render(
		<ConsentProvider
			options={{
				mode: offline(),
				persistence: false,
				prefetch: policyFixture(undefined, { id: 'banner-footer-layout' }),
			}}
		>
			<ConsentBanner disableAnimation />
		</ConsentProvider>
	);
	await vi.waitFor(() => {
		expect(
			document.querySelector('[data-testid="consent-banner-footer"]')
		).toBeInTheDocument();
	});
	const box = (testId: string) => {
		const element = document.querySelector(`[data-testid="${testId}"]`);
		if (!element) {
			throw new Error(`Missing ${testId}`);
		}
		return element.getBoundingClientRect();
	};
	return {
		accept: box('consent-banner-accept-button'),
		card: box('consent-banner-card'),
		customize: box('consent-banner-customize-button'),
		reject: box('consent-banner-reject-button'),
	};
};

const setMaxWidth = function setMaxWidth(value: string) {
	document.documentElement.style.setProperty(
		'--consent-banner-max-width',
		value
	);
};

beforeEach(async () => {
	await page.viewport(1280, 800);
});

afterEach(() => {
	document.documentElement.style.removeProperty('--consent-banner-max-width');
});

describe('ConsentBanner footer layout', () => {
	test('a narrowed card on a wide screen keeps its actions inside the card', async () => {
		setMaxWidth('18rem');
		const { accept, card, customize, reject } = await renderBanner();

		for (const button of [reject, accept, customize]) {
			expect(button.left).toBeGreaterThanOrEqual(card.left);
			expect(button.right).toBeLessThanOrEqual(card.right);
		}
		// Reject and accept share a row; customize takes the row below.
		expect(accept.top).toBe(reject.top);
		expect(customize.top).toBeGreaterThanOrEqual(reject.bottom);
		expect(customize.left).toBe(reject.left);
		expect(customize.right).toBe(accept.right);
	});

	test('the default card keeps every action on one row', async () => {
		const { accept, card, customize, reject } = await renderBanner();

		expect(card.width).toBeGreaterThan(400);
		expect(accept.top).toBe(reject.top);
		expect(customize.top).toBe(reject.top);
		expect(customize.right).toBeLessThanOrEqual(card.right);
	});
});
