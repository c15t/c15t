import { custom } from '@c15t/core';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, expect, test } from 'vitest';

import type { ConsentManagerOptions } from '../lib/types';
import Fixture from './fixtures/dialog-control-fixture.svelte';
import { policyFixture } from './policy-fixture';

const ROOT = '[data-testid="consent-dialog-root"]';
const query = (selector: string) => document.querySelector(selector);

const options = {
	disableAnimation: true,
	mode: custom({}),
	persistence: false,
	prefetch: policyFixture(),
} as ConsentManagerOptions;

/** Records whether `node` leaves the document at any point. */
const watchRemoval = (node: Element) => {
	let removed = false;
	const observer = new MutationObserver(() => {
		if (!node.isConnected) {
			removed = true;
		}
	});
	observer.observe(document.body, { childList: true, subtree: true });
	return {
		stop: () => {
			observer.disconnect();
			return removed || !node.isConnected;
		},
	};
};

const settle = async () => {
	await tick();
	await new Promise((resolve) => {
		setTimeout(resolve, 20);
	});
	await tick();
};

describe('ConsentDialog open prop', () => {
	test('a dialog held open by `open` stays mounted when Escape is pressed', async () => {
		render(Fixture, { open: true, options });
		await waitFor(() => expect(query(ROOT)).not.toBeNull());
		const root = query(ROOT) as HTMLElement;
		const watcher = watchRemoval(root);

		await fireEvent.keyDown(root, { key: 'Escape' });
		await settle();

		expect(watcher.stop()).toBe(false);
		expect(query(ROOT)).toBe(root);
		expect(root.getAttribute('data-state')).toBe('open');
		// Escape still asks the consent manager to close, as in React.
		expect(query('[data-testid="active-ui"]')?.textContent).toBe('none');
	});

	test('a dialog held open by `open` closes when `open` turns false', async () => {
		const result = render(Fixture, { open: true, options });
		await waitFor(() => expect(query(ROOT)).not.toBeNull());

		await result.rerender({ open: false, options });

		await waitFor(() => expect(query(ROOT)).toBeNull());
	});

	test('without `open`, Escape closes the dialog back to the owed banner', async () => {
		render(Fixture, { options });
		await fireEvent.click(query('[data-testid="open-dialog"]') as HTMLElement);
		await waitFor(() => expect(query(ROOT)).not.toBeNull());

		await fireEvent.keyDown(query(ROOT) as HTMLElement, { key: 'Escape' });

		await waitFor(() => expect(query(ROOT)).toBeNull());
		// The fixture's policy still owes a choice.
		expect(query('[data-testid="active-ui"]')?.textContent).toBe('banner');
	});
});

describe('ConsentDialog showCloseButton', () => {
	const CLOSE = '[data-testid="consent-dialog-close"]';

	test('renders no close button by default', async () => {
		render(Fixture, { open: true, options });
		await waitFor(() => expect(query(ROOT)).not.toBeNull());

		expect(query(CLOSE)).toBeNull();
	});

	test('the close button closes the dialog without recording consent', async () => {
		render(Fixture, { options, showCloseButton: true });
		await fireEvent.click(query('[data-testid="open-dialog"]') as HTMLElement);
		await waitFor(() => expect(query(CLOSE)).not.toBeNull());

		const button = query(CLOSE) as HTMLButtonElement;
		expect(button.getAttribute('aria-label')).toBe('Close');
		expect(
			query('[data-testid="consent-dialog-header"]')?.contains(button)
		).toBe(true);

		await fireEvent.click(button);

		await waitFor(() => expect(query(ROOT)).toBeNull());
		// Nothing was recorded, so the policy still owes a choice.
		expect(query('[data-testid="active-ui"]')?.textContent).toBe('banner');
	});
});
