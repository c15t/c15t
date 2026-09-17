/**
 * The banner: which layout the requirement picks, what each control writes, and
 * how little of the tree an unrelated consent change is allowed to touch.
 */

import { afterEach, describe, expect, test, vi } from 'vitest';

import { flush, flushPromises } from '../../__tests__/helpers/fake-native';
import {
	animationState,
	resetNativeStub,
	setFontScale,
	setReduceMotion,
	uiState,
} from '../../__tests__/helpers/react-native-stub';
import { resetConsentClient } from '../../native/client';
import { ConsentBanner } from '../consent-banner';
import { MIN_TAP_TARGET } from '../theme/consent-theme-parts';
import {
	CONTROL_ROLES,
	mountSurface,
	nodeStyle,
	requireRole,
	roleNodes,
	tap,
	translatedSnapshot,
} from './harness';

afterEach(() => {
	resetConsentClient();
	resetNativeStub();
});

describe('ConsentBanner', () => {
	test('renders the opt-in layout when the policy owes a choice', () => {
		const tree = mountSurface(<ConsentBanner />);

		expect(tree.text()).toContain('Deine Privatsphaere');
		expect(tree.text()).toContain('Wir verarbeiten deine Daten.');
		requireRole(tree.container(), 'button', 'Alle akzeptieren');
		requireRole(tree.container(), 'button', 'Alle ablehnen');
		requireRole(tree.container(), 'link', 'Auswahlen');

		tree.unmount();
	});

	test('renders the notice layout when the requirement is a notice', () => {
		const tree = mountSurface(
			<ConsentBanner />,
			translatedSnapshot({
				promptRequirement: { kind: 'notice', reason: 'missing' },
			})
		);

		expect(tree.text()).toContain('Wie wir Daten nutzen');
		expect(tree.text()).toContain('Hinweis: Wir verarbeiten deine Daten.');
		requireRole(tree.container(), 'button', 'Verstanden');

		expect(roleNodes(tree.container(), 'button')).toHaveLength(2);

		tree.unmount();
	});

	test('falls back to English copy when the snapshot carries none', () => {
		const tree = mountSurface(
			<ConsentBanner />,
			translatedSnapshot({ translations: null })
		);

		expect(tree.text()).toContain('Your privacy');
		requireRole(tree.container(), 'button', 'Accept all');

		tree.unmount();
	});

	test('mounts as an overlay so app content cannot shift', () => {
		const tree = mountSurface(
			<>
				<span>app content</span>
				<ConsentBanner />
			</>
		);
		const [layer] = tree
			.container()
			.querySelectorAll<HTMLElement>('[data-pointer-events="box-none"]');

		expect(layer).toBeDefined();
		expect(nodeStyle(layer as HTMLElement).position).toBe('absolute');

		tree.unmount();
	});

	test('accept all and reject all each reach the core once', () => {
		const tree = mountSurface(<ConsentBanner />);

		tap(requireRole(tree.container(), 'button', 'Alle akzeptieren'));

		expect(tree.fake.commitIntents).toHaveLength(1);
		expect(JSON.parse(tree.fake.commitIntents[0] as string)).toEqual({
			action: 'all',
		});

		tap(requireRole(tree.container(), 'button', 'Alle ablehnen'));

		expect(tree.fake.commitIntents).toHaveLength(2);
		expect(JSON.parse(tree.fake.commitIntents[1] as string)).toEqual({
			action: 'necessary',
		});

		tree.unmount();
	});

	test('acknowledge records the dismissal and writes no consent', () => {
		const tree = mountSurface(
			<ConsentBanner />,
			translatedSnapshot({
				promptRequirement: { kind: 'notice', reason: 'expired' },
			})
		);

		tap(requireRole(tree.container(), 'button', 'Verstanden'));

		expect(tree.fake.dismissCalls).toBe(1);
		expect(tree.fake.commitIntents).toEqual([]);

		tree.unmount();
	});

	test('opens the built-in manager when the app brings no surface', async () => {
		const tree = mountSurface(<ConsentBanner />);

		tap(requireRole(tree.container(), 'link', 'Auswahlen'));
		await flushPromises();

		expect(tree.text()).toContain('Zustimmung verwalten');
		expect(tree.text()).not.toContain('Deine Privatsphaere');
		expect(roleNodes(tree.container(), 'switch')).toHaveLength(5);

		tree.unmount();
	});

	test('hands customize to the app when it supplies one', () => {
		const onCustomize = vi.fn();
		const tree = mountSurface(<ConsentBanner onCustomize={onCustomize} />);

		tap(requireRole(tree.container(), 'link', 'Auswahlen'));

		expect(onCustomize).toHaveBeenCalledTimes(1);
		expect(tree.text()).toContain('Deine Privatsphaere');
		expect(roleNodes(tree.container(), 'switch')).toEqual([]);

		tree.unmount();
	});

	test('stays out of the tree when nothing is owed', () => {
		const tree = mountSurface(
			<ConsentBanner />,
			translatedSnapshot({ promptRequirement: { kind: 'none' } })
		);

		expect(tree.text()).not.toContain('Deine Privatsphaere');
		expect(roleNodes(tree.container(), 'button')).toEqual([]);

		tree.unmount();
	});

	test('leaves the tree once the core stops owing a prompt', async () => {
		const tree = mountSurface(<ConsentBanner />);

		await flushPromises();

		expect(tree.text()).toContain('Deine Privatsphaere');

		flush(() => {
			tree.fake.pushSnapshot(
				translatedSnapshot({ promptRequirement: { kind: 'none' }, revision: 4 })
			);
		});
		await flushPromises();
		await flushPromises();

		expect(tree.text()).not.toContain('Deine Privatsphaere');

		tree.unmount();
	});

	test('rerenders only for a change it displays', async () => {
		const tree = mountSurface(<ConsentBanner />);

		await flushPromises();
		tree.resetCommits();

		// A permission grant the banner does not show must not touch it.
		flush(() => {
			tree.fake.pushSnapshot(
				translatedSnapshot({
					effectivePermissions: {
						experience: true,
						functionality: true,
						marketing: true,
						measurement: true,
						necessary: true,
					},
					revision: 2,
				})
			);
		});
		await flushPromises();

		expect(tree.commits()).toBe(0);

		// A requirement the banner does show moves it exactly once.
		flush(() => {
			tree.fake.pushSnapshot(
				translatedSnapshot({
					promptRequirement: { kind: 'notice', reason: 'missing' },
					revision: 3,
				})
			);
		});
		await flushPromises();

		expect(tree.text()).toContain('Wie wir Daten nutzen');
		expect(tree.commits()).toBe(1);

		tree.unmount();
	});

	test('animates on the native driver without a render per frame', async () => {
		const tree = mountSurface(<ConsentBanner />);

		await flushPromises();
		tree.resetCommits();

		expect(animationState.starts).toBeGreaterThan(0);

		await flushPromises();

		expect(animationState.jsDriverStarts).toBe(0);
		expect(tree.commits()).toBe(0);

		tree.unmount();
	});

	test('collapses the animation under reduced motion', async () => {
		setReduceMotion(true);

		const tree = mountSurface(<ConsentBanner />);

		await flushPromises();

		expect(tree.text()).toContain('Deine Privatsphaere');
		expect(animationState.durations).toContain(1);

		tree.unmount();
	});

	test('keeps controls tappable at large dynamic type', () => {
		setFontScale(2);

		const tree = mountSurface(<ConsentBanner />);
		const accept = requireRole(tree.container(), 'button', 'Alle akzeptieren');

		// The tap target never drops below the platform minimum...
		expect(nodeStyle(accept).minHeight).toBeGreaterThanOrEqual(44);

		tree.unmount();

		// ...and it grows with the text rather than clipping it.
		setFontScale(3);

		const large = mountSurface(<ConsentBanner />);
		const largeAccept = requireRole(
			large.container(),
			'button',
			'Alle akzeptieren'
		);

		expect(nodeStyle(largeAccept).minHeight).toBe(66);

		large.unmount();
	});

	test('labels every control it renders', () => {
		const tree = mountSurface(<ConsentBanner />);

		for (const role of CONTROL_ROLES) {
			for (const node of roleNodes(tree.container(), role)) {
				expect(node.getAttribute('aria-label')).toBeTruthy();
			}
		}

		expect(uiState.announcements).toContain('Deine Privatsphaere');

		tree.unmount();
	});
});

describe('banner action row', () => {
	// The Customize link is a run of text, so it is the one control in the row with no
	// background to size it. The row stretches its items, which grew the link's box to
	// the row's height and left the label at the top of it: on a real device Customize
	// rode above Reject All rather than beside it, and wrapped onto a line of its own
	// the tap area fell under the floor the theme enforces everywhere else.
	test('centres the link on the row it shares with a button', () => {
		const tree = mountSurface(<ConsentBanner />);
		const link = nodeStyle(requireRole(tree.container(), 'link', 'Auswahlen'));

		expect(link.justifyContent).toBe('center');
		expect(link.alignItems).toBe('center');
		expect(link.flexShrink).toBe(0);
		expect(link.minHeight).toBeGreaterThanOrEqual(MIN_TAP_TARGET);

		tree.unmount();
	});

	// The two real buttons own their vertical centreing through their part styles, so a
	// fix aimed at the link must not leak into them.
	test('leaves the button kinds to their part styles', () => {
		const tree = mountSurface(<ConsentBanner />);
		const accept = nodeStyle(
			requireRole(tree.container(), 'button', 'Alle akzeptieren')
		);

		expect(accept.minHeight).toBeGreaterThanOrEqual(MIN_TAP_TARGET);
		expect(accept.flexShrink).toBeNull();

		tree.unmount();
	});
});
