/**
 * `disableAnimation` reaches every part of the preference dialog.
 *
 * The dialog marks its overlay, positioner and panel `data-state="open"`,
 * which the stock stylesheet animates with fade and scale keyframes unless
 * `data-disable-animation` is present.
 */
import { clearBrowserConsentStorage } from '@c15t/conformance/suite';
import { afterEach, describe, expect, it } from 'vitest';

import { init } from '../index';
import type { ConsentClient } from '../types';

let client: ConsentClient | undefined;

afterEach(() => {
	client?.dispose();
	client = undefined;
	clearBrowserConsentStorage();
});

const openDialog = async function openDialog(
	disableAnimation: boolean
): Promise<HTMLElement[]> {
	client = init({
		mode: 'offline',
		overrides: { country: 'DE' },
		ui: { colorScheme: 'light', disableAnimation },
	});
	await client.ready();
	client.openDialog();
	const root = client.ui?.root;
	await expect
		.poll(() => root?.querySelector('[data-testid="consent-dialog-root"]'))
		.toBeTruthy();
	const panel = root?.querySelector<HTMLElement>(
		'[data-testid="consent-dialog-root"]'
	);
	const overlay = root?.querySelector<HTMLElement>(
		'[data-testid="consent-dialog-overlay"]'
	);
	return [overlay, panel?.parentElement, panel].filter(
		(element): element is HTMLElement => element instanceof HTMLElement
	);
};

const animationsOf = (parts: HTMLElement[]): string[] =>
	parts.flatMap((part) =>
		part
			.getAnimations()
			.map((animation) =>
				'animationName' in animation
					? String(animation.animationName)
					: String((animation as CSSTransition).transitionProperty)
			)
	);

describe('preference dialog motion', () => {
	it('fades the dialog in by default', async () => {
		const parts = await openDialog(false);

		expect(parts).toHaveLength(3);
		expect(animationsOf(parts)).not.toEqual([]);
	});

	it('opens without animating any part when disableAnimation is set', async () => {
		const parts = await openDialog(true);

		expect(parts).toHaveLength(3);
		expect(animationsOf(parts)).toEqual([]);
	});
});
