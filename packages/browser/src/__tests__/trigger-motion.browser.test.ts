/**
 * `disableAnimation` stops the floating trigger's hover and snap
 * transitions, as it stops the banner's and the dialog's.
 */
import { clearBrowserConsentStorage } from '@c15t/conformance/suite';
import { afterEach, describe, expect, it } from 'vitest';

import { classes } from '../generated/styles';
import type { ConsentClient } from '../types';
import { init } from './fixtures/factory-init';

let client: ConsentClient | undefined;

afterEach(() => {
	client?.dispose();
	client = undefined;
	clearBrowserConsentStorage();
});

const mountTrigger = async function mountTrigger(
	disableAnimation: boolean
): Promise<HTMLElement> {
	client = init({
		mode: 'offline',
		overrides: { country: 'DE' },
		ui: {
			banner: false,
			colorScheme: 'light',
			disableAnimation,
			shadow: false,
			trigger: { showWhen: 'always' },
		},
	});
	await client.ready();
	const trigger = client.ui?.root.querySelector<HTMLElement>(
		'[data-testid="consent-dialog-trigger"]'
	);
	if (!trigger) {
		throw new Error('The trigger did not render');
	}
	return trigger;
};

/** The longest transition the element would run, in seconds. */
const longestTransition = (element: HTMLElement): number =>
	Math.max(
		...getComputedStyle(element)
			.transitionDuration.split(',')
			.map((value) => Number.parseFloat(value))
	);

describe('floating trigger motion', () => {
	it('transitions on hover by default', async () => {
		const trigger = await mountTrigger(false);
		expect(longestTransition(trigger)).toBeGreaterThan(0);
	});

	it('does not transition with disableAnimation', async () => {
		const trigger = await mountTrigger(true);
		expect(trigger.hasAttribute('data-disable-animation')).toBe(true);
		expect(longestTransition(trigger)).toBe(0);
		// The snap to a corner after a drag runs under its own class.
		trigger.classList.add(classes.trigger.snapping);
		expect(longestTransition(trigger)).toBe(0);
	});
});
