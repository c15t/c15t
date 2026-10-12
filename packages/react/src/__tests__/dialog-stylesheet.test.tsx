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
import { expect, test, vi } from 'vitest';

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
					mode: offline(),
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
