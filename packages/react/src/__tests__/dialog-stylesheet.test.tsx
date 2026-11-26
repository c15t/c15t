/**
 * The dialog's rules ship in `styles.css`, the one stylesheet an app
 * imports. No module in the package imports CSS: the Next.js Pages Router
 * refuses to build an app whose dependencies import global CSS. These fail
 * if the dialog's rules leave `styles.css`, which would leave the dialog
 * unstyled in an app that imports only that file.
 */
import '@c15t/ui/styles.css';
import panelStyles from '@c15t/ui/styles/components/consent-dialog';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';

import { ConsentDialog } from '../aggregate-components';
import { ConsentProvider } from '../provider';
import { offline } from '../transports/offline';
import { policyFixture } from './policy-fixture';

interface CardStyle {
	display: string;
	position: string;
}

const cardStyle = (element: Element): CardStyle => {
	const style = getComputedStyle(element);
	return { display: style.display, position: style.position };
};

/** `.card` in panel.module.css: `position: relative; display: flex`. */
const STYLED_CARD: CardStyle = { display: 'flex', position: 'relative' };

test('styles.css styles the dialog card', () => {
	const probe = document.createElement('div');
	probe.className = panelStyles.card ?? '';
	document.body.append(probe);
	try {
		expect(panelStyles.card).toBeTruthy();
		expect(cardStyle(probe)).toEqual(STYLED_CARD);
	} finally {
		probe.remove();
	}
});

test('the lazy dialog renders styled from its first frame', async () => {
	const container = document.createElement('div');
	document.body.append(container);
	const root = createRoot(container);

	// Record the card's style synchronously on insertion, before the browser
	// can paint it.
	let atInsertion: CardStyle | undefined;
	const observer = new MutationObserver(() => {
		const card = document.querySelector('[data-testid="consent-dialog-card"]');
		if (card && !atInsertion) {
			atInsertion = cardStyle(card);
		}
	});
	observer.observe(document.body, { childList: true, subtree: true });

	try {
		root.render(
			<ConsentProvider
				options={{
					mode: offline({ acknowledgeNoRecords: true }),
					persistence: false,
					prefetch: policyFixture(),
				}}
			>
				<ConsentDialog
					disableAnimation
					open
				/>
			</ConsentProvider>
		);
		await vi.waitFor(() => expect(atInsertion).toBeDefined());
		expect(atInsertion).toEqual(STYLED_CARD);
	} finally {
		observer.disconnect();
		root.unmount();
		container.remove();
	}
});

afterEach(async () => {
	await page.viewport(414, 896);
});

test.each([
	['phone', 375, 600],
	['desktop', 1280, 800],
])(
	'the close button stays level with the title on %s viewports',
	async (_label, width, height) => {
		await page.viewport(width, height);
		const container = document.createElement('div');
		document.body.append(container);
		const root = createRoot(container);
		try {
			root.render(
				<ConsentProvider
					options={{
						mode: offline({ acknowledgeNoRecords: true }),
						persistence: false,
						prefetch: policyFixture(),
					}}
				>
					<ConsentDialog
						disableAnimation
						open
						showCloseButton
					/>
				</ConsentProvider>
			);
			await vi.waitFor(() =>
				expect(
					document.querySelector('[data-testid="consent-dialog-close"]')
				).not.toBeNull()
			);
			const header = document.querySelector<HTMLElement>(
				'[data-testid="consent-dialog-header"]'
			);
			const title = document.querySelector<HTMLElement>(
				'[data-testid="consent-dialog-title"]'
			);
			const close = document.querySelector<HTMLElement>(
				'[data-testid="consent-dialog-close"]'
			);
			if (!(header && title && close)) {
				throw new Error('Expected dialog header, title, and close button');
			}
			const headerRect = header.getBoundingClientRect();
			const titleRect = title.getBoundingClientRect();
			const closeRect = close.getBoundingClientRect();
			const titleCenterY = titleRect.top + titleRect.height / 2;
			const closeCenterY = closeRect.top + closeRect.height / 2;

			expect(header.hasAttribute('data-has-close-button')).toBe(true);
			expect(Math.abs(titleCenterY - closeCenterY)).toBeLessThanOrEqual(2);
			expect(titleRect.right).toBeLessThanOrEqual(closeRect.left);
			expect(headerRect.right - closeRect.right).toBeCloseTo(
				closeRect.top - headerRect.top,
				0
			);
		} finally {
			root.unmount();
			container.remove();
		}
	}
);

test('a headless close button does not reserve stock header end padding', async () => {
	const container = document.createElement('div');
	document.body.append(container);
	const root = createRoot(container);
	try {
		root.render(
			<ConsentProvider
				options={{
					components: { dialog: { closeButton: { className: 'headless' } } },
					mode: offline({ acknowledgeNoRecords: true }),
					persistence: false,
					prefetch: policyFixture(),
				}}
			>
				<ConsentDialog
					disableAnimation
					open
					showCloseButton
				/>
			</ConsentProvider>
		);
		await vi.waitFor(() =>
			expect(
				document.querySelector('[data-testid="consent-dialog-close"]')
			).not.toBeNull()
		);
		const header = document.querySelector<HTMLElement>(
			'[data-testid="consent-dialog-header"]'
		);
		if (!header) {
			throw new Error('Expected dialog header');
		}
		expect(header.hasAttribute('data-has-close-button')).toBe(false);
		const style = getComputedStyle(header);
		expect(style.paddingInlineEnd).toBe(style.paddingInlineStart);
	} finally {
		root.unmount();
		container.remove();
	}
});
