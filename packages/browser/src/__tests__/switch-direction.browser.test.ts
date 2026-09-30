/**
 * A checked switch keeps its thumb inside the track in right-to-left copy.
 *
 * The thumb starts at the inline start of the track, which is the right
 * edge in RTL, so the checked state has to move it left there. No adapter
 * puts `dir` on the switch itself: it inherits it from the dialog.
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

/** How far each checked thumb sits outside its track, in pixels. */
const thumbOverflow = function thumbOverflow(root: ParentNode): number[] {
	return [
		...root.querySelectorAll<HTMLElement>(
			'[role="switch"][data-state="checked"]'
		),
	].map((control) => {
		const track = control.querySelector('[data-slot="switch-track"]');
		const thumb = control.querySelector('[data-slot="switch-thumb"]');
		if (!(track && thumb)) {
			return Number.POSITIVE_INFINITY;
		}
		const outer = track.getBoundingClientRect();
		const inner = thumb.getBoundingClientRect();
		return Math.round(
			Math.max(0, outer.left - inner.left, inner.right - outer.right)
		);
	});
};

const openDialog = async function openDialog(
	language: string
): Promise<ParentNode> {
	client = init({
		// Offline mode renders a language only when it has copy for it.
		i18n: { messages: { he: { consentManagerDialog: { title: 'פרטיות' } } } },
		mode: 'offline',
		overrides: { country: 'DE', language },
		ui: { colorScheme: 'light', disableAnimation: true },
	});
	await client.ready();
	client.openDialog();
	const root = client.ui?.root;
	if (!root) {
		throw new Error('The UI did not mount');
	}
	await expect
		.poll(() => root.querySelector('[role="switch"][data-state="checked"]'))
		.toBeTruthy();
	return root;
};

describe('switch thumb direction', () => {
	it.each(['en', 'he'])(
		'keeps checked thumbs inside the track in %s',
		async (language) => {
			const root = await openDialog(language);
			const panel = root.querySelector('[data-testid="consent-dialog-root"]');
			expect(panel?.getAttribute('dir')).toBe(
				language === 'he' ? 'rtl' : 'ltr'
			);

			// Check an optional category too, so an enabled checked switch is
			// measured next to the disabled necessary one.
			root
				.querySelector<HTMLElement>('[role="switch"][data-state="unchecked"]')
				?.click();

			await expect
				.poll(() => thumbOverflow(root))
				.toSatisfy(
					(overflows: number[]) =>
						overflows.length > 0 &&
						overflows.every((overflow) => overflow === 0)
				);
		}
	);
});
