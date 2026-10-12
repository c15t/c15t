/**
 * The roles this package asks a platform to name, checked against the list the platform can
 * actually name.
 *
 * React Native carries two role props with two different vocabularies. `accessibilityRole` is
 * Android's TalkBack enum, and a string outside it is not ignored: the view manager throws
 * `IllegalArgumentException: Invalid accessibility role value`, which arrives as a redbox over
 * the consent prompt. `role` is the ARIA union, parsed once in shared C++ and mapped to
 * whatever each platform has. `region` and `dialog` live only in the second list, so the
 * surfaces pass them there, and this file keeps them out of the first.
 */

import type { ReactElement } from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import { resetNativeStub } from '../../__tests__/helpers/react-native-stub';
import { resetConsentClient } from '../../native/client';
import { ConsentBanner } from '../consent-banner';
import { ConsentDialog } from '../consent-dialog';
import { ConsentPreferences } from '../consent-preferences';
import type { SurfaceTree } from './harness';
import { mountSurface, roleNodes, surfaceNode } from './harness';

/**
 * `ReactAccessibilityDelegate.AccessibilityRole`, lowercased, which is how React Native
 * compares the value it is handed. Read off the platform, not off the `AccessibilityRole`
 * TypeScript union, because that union is the wider of the two and would pass the value that
 * broke an app.
 */
const ANDROID_ROLES = new Set([
	'adjustable',
	'alert',
	'button',
	'checkbox',
	'combobox',
	'drawerlayout',
	'dropdownlist',
	'grid',
	'header',
	'horizontalscrollview',
	'iconmenu',
	'image',
	'imagebutton',
	'keyboardkey',
	'link',
	'list',
	'menu',
	'menubar',
	'menuitem',
	'none',
	'pager',
	'progressbar',
	'radio',
	'radiogroup',
	'scrollbar',
	'scrollview',
	'search',
	'slidingdrawer',
	'spinbutton',
	'summary',
	'switch',
	'tab',
	'tablist',
	'text',
	'timer',
	'togglebutton',
	'toolbar',
	'viewgroup',
	'webview',
]);

const SURFACES: readonly [string, () => ReactElement][] = [
	['the banner', () => <ConsentBanner />],
	[
		'the dialog',
		() => (
			<ConsentDialog
				onRequestClose={() => {
					/* closing writes nothing */
				}}
				open
			/>
		),
	],
	[
		'the preference centre',
		() => (
			<ConsentPreferences
				onRequestClose={() => {
					/* closing writes nothing */
				}}
				open
			/>
		),
	],
];

/** Every `accessibilityRole` the tree asked the platform to name. */
const requestedRoles = function requestedRoles(
	tree: SurfaceTree
): (null | string)[] {
	return [
		...tree.container().querySelectorAll<HTMLElement>('[data-rn-role]'),
	].map((node) => node.getAttribute('data-rn-role'));
};

afterEach(() => {
	resetConsentClient();
	resetNativeStub();
});

describe('accessibility roles', () => {
	test.each(SURFACES)(
		'%s names only roles Android can compile',
		(_name, surface) => {
			const tree = mountSurface(surface());

			expect(
				requestedRoles(tree).filter((role) => !ANDROID_ROLES.has(role ?? ''))
			).toEqual([]);

			tree.unmount();
		}
	);

	test('the banner is still a region landmark without asking for a region role', () => {
		const tree = mountSurface(<ConsentBanner />);

		expect(surfaceNode(tree.container()).getAttribute('role')).toBe('region');
		expect(requestedRoles(tree)).not.toContain('region');

		tree.unmount();
	});

	test('the banner names every action a button, customize included', () => {
		const tree = mountSurface(<ConsentBanner />);

		// Customize used to be a run of underlined text, which is a caption to a
		// reader and a guess to a finger. Web renders it as a control.
		//
		// The one link is the branding tab, and it leads: it is mounted ahead of the
		// card rather than inside it, which is what the order here records. Every
		// action a subject can take on the consent state is a button.
		expect(
			requestedRoles(tree).filter(
				(role) => role === 'button' || role === 'link'
			)
		).toEqual(['link', 'button', 'button', 'button']);

		tree.unmount();
	});

	test('the branding tab names the brand and sits outside the card', () => {
		const tree = mountSurface(<ConsentBanner />);
		const [tab] = roleNodes(tree.container(), 'link');

		// The web tag is an anchor whose name is the text it wraps, "Secured by"
		// then the wordmark. A reader on mobile has to hear the same sentence, not
		// the mark announced as an unlabelled image.
		expect(tab.getAttribute('aria-label')).toBe('Secured by c15t');

		// The card clips, so a tab inside it would be cut off along the very edge it
		// is meant to merge into. Being the card's preceding sibling is the only
		// position that keeps the two outlines continuous.
		const card = surfaceNode(tree.container());
		expect(tab.parentElement?.parentElement).not.toBe(card);
		expect(tab.nextElementSibling).toBe(card);

		tree.unmount();
	});

	test('the dialog sheet keeps its landmark, and the label that goes with it', () => {
		const tree = mountSurface(
			<ConsentDialog
				onRequestClose={() => {
					/* closing writes nothing */
				}}
				open
			/>
		);

		// React Native's own `Modal` is a dialog too, so the sheet has to be findable as one:
		// the landmark it names itself with is what a reader lands on.
		expect(surfaceNode(tree.container()).getAttribute('role')).toBe('dialog');
		expect(requestedRoles(tree)).not.toContain('dialog');

		tree.unmount();
	});
});
