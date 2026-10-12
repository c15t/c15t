/**
 * The interactivity rows are only meaningful if a real banner really rendered real
 * controls, and if a tap really reached the module. These cases fail when the tree
 * goes quiet, which is the failure that would otherwise print a plausible number.
 */

import { describe, expect, it } from 'vitest';

import { measureUiInteractive } from '../measure/ui-interactive';

const result = measureUiInteractive(6);

describe('time until the consent UI is interactive', () => {
	it('measures without giving up', () => {
		expect(result.unavailable).toBeUndefined();
	});

	it('renders a banner with the three actions the fixture owes', () => {
		expect(result.controls).toBe(3);
	});

	it('times a cold mount and warm mounts separately', () => {
		expect(result.coldMountMs).toBeGreaterThan(0);
		expect(result.mountMs).toBeGreaterThan(0);
		expect(result.samples).toBe(6);
	});

	it('opens in response to a snapshot event', () => {
		expect(result.openMs).toBeGreaterThan(0);
	});

	it('takes a tap to an acknowledged commit', () => {
		expect(result.actionToCommitMs).toBeGreaterThan(0);
	});

	it('closes the banner once the subject accepted', () => {
		expect(result.controlsAfterAccept).toBe(0);
	});
});
