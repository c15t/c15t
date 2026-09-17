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
import { lightTheme } from '../theme/create-consent-theme';
import {
	CONTROL_ROLES,
	mountSurface,
	nodeStyle,
	requireRole,
	roleNodes,
	surfaceNode,
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
		requireRole(tree.container(), 'button', 'Auswahlen');

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

		expect(tree.text()).toContain('We value your privacy');
		requireRole(tree.container(), 'button', 'Accept All');

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

		tap(requireRole(tree.container(), 'button', 'Auswahlen'));
		await flushPromises();

		expect(tree.text()).toContain('Zustimmung verwalten');
		expect(tree.text()).not.toContain('Deine Privatsphaere');
		expect(roleNodes(tree.container(), 'switch')).toHaveLength(5);

		tree.unmount();
	});

	test('hands customize to the app when it supplies one', () => {
		const onCustomize = vi.fn();
		const tree = mountSurface(<ConsentBanner onCustomize={onCustomize} />);

		tap(requireRole(tree.container(), 'button', 'Auswahlen'));

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

		// The floor is the label's own line box at this scale, so the number is
		// read from the token rather than repeated here.
		expect(nodeStyle(largeAccept).minHeight).toBe(
			Math.round(lightTheme.typography.label.lineHeight * 3)
		);

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
	// A device measurement put all three actions in one flex row: the labels won the
	// arithmetic, `Reject All` came out four times as wide as `Customize`, and the
	// third action read as a caption instead of a control. Web keeps the two
	// decisions in a row of their own and gives customize the row below them, so the
	// structure is pinned here rather than left to the width of a word.
	test('the two decisions share a row and each takes half of it', () => {
		const tree = mountSurface(<ConsentBanner />);
		const accept = requireRole(tree.container(), 'button', 'Alle akzeptieren');
		const reject = requireRole(tree.container(), 'button', 'Alle ablehnen');

		expect(accept.parentElement).toBe(reject.parentElement);
		expect(nodeStyle(accept.parentElement as HTMLElement).flexDirection).toBe(
			'row'
		);

		for (const action of [accept, reject]) {
			const style = nodeStyle(action);

			// Half the row each, rather than a share decided by the label.
			expect(style.flexGrow).toBe(1);
			expect(style.flexShrink).toBe(1);
			expect(style.flexBasis).toBe(0);
			expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TAP_TARGET);
		}

		tree.unmount();
	});

	test('customize is a control on a row of its own', () => {
		const tree = mountSurface(<ConsentBanner />);
		const accept = requireRole(tree.container(), 'button', 'Alle akzeptieren');
		const customize = requireRole(tree.container(), 'button', 'Auswahlen');

		// It used to be a run of underlined text with no box to press, which is how
		// it ended up squeezed into the actions row beside two real buttons.
		expect(customize.parentElement).not.toBe(accept.parentElement);
		expect(
			nodeStyle(customize.parentElement as HTMLElement).flexDirection
		).toBe('column');

		const style = nodeStyle(customize);

		expect(style.flexGrow).toBe(1);
		expect(style.flexBasis).toBe(0);
		expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TAP_TARGET);

		tree.unmount();
	});

	test('every action is outlined, and the decisions carry the accent', () => {
		const tree = mountSurface(<ConsentBanner />);

		const outlined = (name: string, accent: boolean): void => {
			const action = requireRole(tree.container(), 'button', name);
			const style = nodeStyle(action);
			const label = nodeStyle(action.firstElementChild as HTMLElement);

			// Web strokes these rather than filling them: the card shows through.
			expect(style.backgroundColor).toBe(lightTheme.colors.surface);
			expect(style.borderWidth).toBe(1);
			expect(style.borderColor).toBe(
				accent ? lightTheme.colors.primary : lightTheme.colors.border
			);
			expect(label.color).toBe(
				accent ? lightTheme.colors.primary : lightTheme.colors.text
			);
			expect(label.fontWeight).toBe('500');
		};

		// Both decisions carry the accent and only the detour below them is
		// neutral, which is how the web banner reads at a glance.
		outlined('Alle akzeptieren', true);
		outlined('Alle ablehnen', true);
		outlined('Auswahlen', false);

		tree.unmount();
	});

	test('the actions sit on a band divided from the card', () => {
		const tree = mountSurface(<ConsentBanner />);
		const footer = nodeStyle(
			requireRole(tree.container(), 'button', 'Auswahlen')
				.parentElement as HTMLElement
		);

		expect(footer.backgroundColor).toBe(lightTheme.colors.surfaceRaised);
		expect(footer.borderTopWidth).toBe(1);
		expect(footer.borderTopColor).toBe(lightTheme.colors.border);

		const card = nodeStyle(
			surfaceNode(tree.container(), 'Deine Privatsphaere')
		);

		// The heading above the band stays on the plain card surface, and the card
		// itself carries the border and elevation the web banner draws.
		expect(card.backgroundColor).toBe(lightTheme.colors.surface);
		expect(card.borderWidth).toBe(1);
		expect(card.borderColor).toBe(lightTheme.colors.border);
		expect(card.boxShadow).toBe('0 8px 24px rgba(0, 0, 0, 0.12)');

		tree.unmount();
	});
});
