/**
 * The measured geometry of the consent surfaces, asserted against the numbers
 * taken off the running web demo rather than off the mobile components.
 *
 * `web-token-parity.test.ts` covers everything `packages/ui` publishes as a
 * token: it reads the shipped CSS and resolves the `var()` hops, so colours,
 * radii, spacing and the type scale cannot drift. This file is the other half,
 * the facts that are not tokens anywhere and therefore have nothing to be
 * diffed against: which action carries the accent, the box an action draws and
 * the hit area that reaches the platform minimum, the height of a collapsed
 * category card and the pitch between two of them, the rhythm inside a footer
 * band, and how far the card sits off the bottom of the screen.
 *
 * Two of them contradict what this package used to do, and one contradicts the
 * stale `/tmp/web-ref` captures:
 *
 * - The accent action is `Customize` on the banner and `Save Settings` in the
 *   dialog. `packages/core` picks that default so "reject and accept stay
 *   neutral together", and nothing is ever filled.
 * - A web action is 35.5 tall. The 44pt target is a touch requirement, not a
 *   drawing requirement, so it lives on the hit area.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';

import { resetNativeStub } from '../../__tests__/helpers/react-native-stub';
import { resetConsentClient } from '../../native/client';
import type { ConsentSnapshot } from '../../protocol';
import { ConsentBanner } from '../consent-banner';
import { ConsentDialog } from '../consent-dialog';
import { ConsentPreferences } from '../consent-preferences';
import { MIN_TAP_TARGET } from '../theme/consent-theme-parts';
import { lightTheme } from '../theme/create-consent-theme';
import { BANNER_FOOTER_PADDING_HORIZONTAL } from '../theme/use-consent-styles';
import {
	hitSlop,
	mountSurface,
	nodeStyle,
	requireRole,
	roleNodes,
	surfaceNode,
	tap,
	translatedSnapshot,
} from './harness';

/**
 * The web's own neutrals, computed from the tokens in `packages/ui`:
 * `hsl(0, 0%, 90%)` border, `hsl(0, 0%, 98%)` surface-hover, `hsl(0, 0%, 10%)`
 * text, `hsl(0, 0%, 40%)` muted.
 */
const WEB = {
	border: '#E6E6E6',
	muted: '#666666',
	surface: '#FFFFFF',
	surfaceHover: '#FAFAFA',
	text: '#1A1A1A',
} as const;

/** The drawn box `button.module.css` gives a consent action. */
const BUTTON = {
	fontSize: 14,
	lineHeight: 17.5,
	paddingHorizontal: 12,
	paddingVertical: 8,
	radius: 8,
} as const;

/** The action a subject takes, named by the label on its control. */
type ActionLabel = 'Accept All' | 'Acknowledge' | 'Customize' | 'Reject All';

/**
 * A snapshot with no backend bundle, so every label is the English fallback.
 *
 * The measurements in addendum 3 were read off the English web surfaces, and this
 * file names controls by their label, so it has to pin the language rather than
 * inherit the German bundle the other suites mount with.
 *
 * @param overrides - Snapshot fields to change.
 * @returns A snapshot the surfaces fall back to English for.
 */
const englishSnapshot = function englishSnapshot(
	overrides: Partial<ConsentSnapshot> = {}
): ConsentSnapshot {
	return translatedSnapshot({ translations: null, ...overrides });
};

/** A snapshot for a policy that only owes a notice. */
const noticeSnapshot = function noticeSnapshot(): ConsentSnapshot {
	return englishSnapshot({
		promptRequirement: { kind: 'notice', reason: 'missing' },
	});
};

/**
 * The footer band of a surface.
 *
 * @param container - Rendered tree to search.
 * @returns The element carrying the band's background.
 */
const footerNode = function footerNode(container: HTMLElement): HTMLElement {
	const drawn = [
		...container.querySelectorAll<HTMLElement>('[data-rn-style]'),
	].find((node) => nodeStyle(node).backgroundColor === WEB.surfaceHover);

	if (drawn === undefined) {
		throw new Error('expected the banner to draw a footer band');
	}

	return drawn;
};

/**
 * The accent treatment one action carries.
 *
 * @param container - Rendered tree to search.
 * @param label - The action to look up.
 * @returns The container and label styles of that control.
 */
const actionStyles = function actionStyles(
	container: HTMLElement,
	label: ActionLabel
): { container: Record<string, unknown>; label: Record<string, unknown> } {
	const node = requireRole(container, 'button', label);

	return {
		container: nodeStyle(node),
		label: nodeStyle(node.querySelector('span') as HTMLElement),
	};
};

/**
 * Whether an action is drawn in the accent.
 *
 * @param container - Rendered tree to search.
 * @param label - The action to look up.
 * @returns `true` when both the outline and the label carry the accent.
 */
const isAccent = function isAccent(
	container: HTMLElement,
	label: ActionLabel
): boolean {
	const { container: box, label: text } = actionStyles(container, label);

	return (
		box.borderColor === lightTheme.colors.primary &&
		text.color === lightTheme.colors.primary
	);
};

/** The absolutely positioned layer a banner mounts in. */
const bannerLayerStyle = function bannerLayerStyle(
	container: HTMLElement
): Record<string, unknown> {
	const layer = container.querySelector('[data-pointer-events="box-none"]');

	if (layer === null) {
		throw new Error(
			'expected the banner to mount in an absolutely positioned layer'
		);
	}

	return nodeStyle(layer as HTMLElement);
};

afterEach(() => {
	resetConsentClient();
	resetNativeStub();
});

describe('heading tracking', () => {
	test('is the em figure multiplied out by the size that draws it', () => {
		// `prompt.module.css` tracks the 16pt banner heading at `-0.011em`, which is
		// -0.176, and `panel.module.css` tracks the 14pt dialog heading at
		// `-0.025em`, which is -0.35. React Native takes an absolute length, so the
		// product is what has to land on the part, and one figure cannot serve both.
		const banner = mountSurface(<ConsentBanner />, englishSnapshot());

		expect(
			nodeStyle(roleNodes(banner.container(), 'header')[0] as HTMLElement)
				.letterSpacing
		).toBe(-0.176);

		banner.unmount();

		const dialog = mountSurface(
			<ConsentDialog
				onRequestClose={vi.fn()}
				open
			/>,
			englishSnapshot()
		);

		expect(
			nodeStyle(roleNodes(dialog.container(), 'header')[0] as HTMLElement)
				.letterSpacing
		).toBe(-0.35);

		dialog.unmount();
	});
});

describe('action roles', () => {
	test('the banner puts the accent on Customize, not on the decisions', () => {
		const tree = mountSurface(<ConsentBanner />, englishSnapshot());

		// `primaryActions` defaults to `customize` precisely so the two decisions
		// stay neutral together. Mobile had this the other way round.
		expect(isAccent(tree.container(), 'Customize')).toBe(true);
		expect(isAccent(tree.container(), 'Reject All')).toBe(false);
		expect(isAccent(tree.container(), 'Accept All')).toBe(false);

		tree.unmount();
	});

	test('the two decisions are drawn in the text colour and the border token', () => {
		const tree = mountSurface(<ConsentBanner />, englishSnapshot());

		for (const label of ['Reject All', 'Accept All'] as const) {
			const { container: box, label: text } = actionStyles(
				tree.container(),
				label
			);

			expect(box.borderColor).toBe(lightTheme.colors.border);
			expect(text.color).toBe(WEB.text);
			// Stroke mode, always. Web has a filled mode and the consent surfaces
			// never ask for it.
			expect(box.backgroundColor).toBe(WEB.surface);
		}

		tree.unmount();
	});

	test('a bare notice promotes its only action', () => {
		const tree = mountSurface(<ConsentBanner />, noticeSnapshot());

		// `resolveBannerPrimaryActions` promotes `dismiss` when it is the only
		// control on the surface, because a notice offers no customize.
		expect(isAccent(tree.container(), 'Acknowledge')).toBe(true);

		tree.unmount();
	});
});

describe('button box', () => {
	test('is the web box, not an inflated one', () => {
		const tree = mountSurface(<ConsentBanner />, englishSnapshot());
		const { container: box, label: text } = actionStyles(
			tree.container(),
			'Accept All'
		);

		expect(box.paddingVertical).toBe(BUTTON.paddingVertical);
		expect(box.paddingHorizontal).toBe(BUTTON.paddingHorizontal);
		expect(box.borderRadius).toBe(BUTTON.radius);
		expect(text.fontSize).toBe(BUTTON.fontSize);
		expect(text.lineHeight).toBe(BUTTON.lineHeight);

		tree.unmount();
	});

	test('gives the accent ring its 2pt without growing the box', () => {
		const tree = mountSurface(<ConsentBanner />, englishSnapshot());
		const { container: box } = actionStyles(tree.container(), 'Customize');

		// Web keeps `border: 1px` on both variants and lays an accent ring *inside*
		// it (`inset 0 0 0 1px var(--button-primary)`), so the accent action reads 2px
		// thick and exactly as tall as its neutral neighbours. React Native has no
		// inset ring, so the border goes to 2 and a point of padding each side pays
		// for it: 2 + 7 lands the label the same 9pt from the edge that web's 1 + 8
		// does, and the box stays 35.5.
		expect(box.borderWidth).toBe(2);
		expect(box.paddingVertical).toBe(7);
		expect(box.paddingHorizontal).toBe(11);
		expect(box.borderRadius).toBe(BUTTON.radius);
		expect(Number(box.paddingVertical) * 2 + BUTTON.lineHeight + 4).toBe(35.5);

		tree.unmount();
	});

	test('keeps the tap target on the hit area rather than the drawing', () => {
		const tree = mountSurface(<ConsentBanner />, englishSnapshot());
		const node = requireRole(tree.container(), 'button', 'Accept All');
		const box = nodeStyle(node);

		// 8 + 17.5 + 8 + the two hairlines is 35.5, which is what web draws. The
		// 44pt floor is a touch requirement, so it grows the touch area instead of
		// stretching the control.
		expect(box.minHeight).toBeNull();

		const slop = hitSlop(node);

		expect(
			BUTTON.paddingVertical * 2 +
				BUTTON.lineHeight +
				2 +
				slop.top +
				slop.bottom
		).toBeGreaterThanOrEqual(MIN_TAP_TARGET);

		tree.unmount();
	});
});

describe('banner footer', () => {
	test('steps 8 between the action rows', () => {
		const tree = mountSurface(<ConsentBanner />, englishSnapshot());
		const footer = footerNode(tree.container());

		// `.actionRoot` is `gap: 1rem`, but `[data-split]` — two action groups,
		// which is the ordinary banner — overrides it to `0.5rem`.
		expect(nodeStyle(footer).gap).toBe(8);
	});

	test('keeps 16 deep and 20 in, on the hover band under a rule', () => {
		const tree = mountSurface(<ConsentBanner />, englishSnapshot());
		const style = nodeStyle(footerNode(tree.container()));

		expect(style.paddingTop).toBe(16);
		expect(style.paddingBottom).toBe(16);
		expect(style.paddingHorizontal).toBe(BANNER_FOOTER_PADDING_HORIZONTAL);
		expect(style.backgroundColor).toBe(WEB.surfaceHover);
		expect(style.borderTopColor).toBe(WEB.border);
		expect(style.borderTopWidth).toBe(1);

		tree.unmount();
	});
});

describe('dialog card', () => {
	test('is centred in the overlay with the web gutter all round', () => {
		const tree = mountSurface(
			<ConsentDialog
				onRequestClose={vi.fn()}
				open
			/>,
			englishSnapshot()
		);
		const card = surfaceNode(tree.container());
		const layer = card.parentElement?.parentElement as HTMLElement;
		const layerStyles = nodeStyle(layer);

		// `--consent-dialog-content-overlay` pads 16 and centres, and the card is
		// `min(100%, 28rem)`, so the mobile sheet used to sit against the bottom edge
		// with no gutter at the sides was never the web surface.
		expect(layerStyles.justifyContent).toBe('center');
		expect(layerStyles.alignItems).toBe('center');
		// The vertical padding is the same gutter plus the device bands, which
		// `safe-area.test.tsx` measures; the sides are the gutter on its own.
		expect(layerStyles.paddingLeft).toBe(16);
		expect(layerStyles.paddingRight).toBe(16);
		expect(nodeStyle(card).maxWidth).toBe(448);

		tree.unmount();
	});

	test('draws the web card outline, and only a centred card draws it', () => {
		const dialog = mountSurface(
			<ConsentDialog
				onRequestClose={vi.fn()}
				open
			/>,
			englishSnapshot()
		);
		const sheet = mountSurface(
			<ConsentDialog
				onRequestClose={vi.fn()}
				open
				presentation="sheet"
			/>,
			englishSnapshot()
		);

		// The card carries the web dialog's own 1px border and `shadow-sm`. A bottom
		// sheet runs edge to edge, so it keeps the fill and the corners and gives up
		// the outline it has nowhere to show.
		expect(nodeStyle(surfaceNode(dialog.container()))).toMatchObject({
			borderColor: lightTheme.colors.border,
			borderRadius: lightTheme.radius.surface,
			borderWidth: 1,
			boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
		});
		expect(nodeStyle(surfaceNode(sheet.container())).borderWidth).toBe(0);

		// The grab handle belongs to the sheet alone: it says the card can be dragged,
		// and a centred card cannot.
		const dialogMotion = surfaceNode(dialog.container())
			.parentElement as HTMLElement;

		expect(dialogMotion.firstElementChild).toBe(
			surfaceNode(dialog.container())
		);

		const sheetMotion = surfaceNode(sheet.container()).parentElement
			?.firstElementChild as HTMLElement;

		expect(nodeStyle(sheetMotion)).toMatchObject({ height: 4, width: 36 });

		dialog.unmount();
		sheet.unmount();
	});

	test('puts the accent on Save Settings and offers nothing else', () => {
		const tree = mountSurface(
			<ConsentPreferences
				onRequestClose={vi.fn()}
				open
			/>,
			englishSnapshot()
		);
		const card = surfaceNode(tree.container(), 'Manage preferences');
		const footer = card.lastElementChild as HTMLElement;
		const actions = roleNodes(footer, 'button');

		// The live centre renders three actions and nothing below them: leaving is the
		// scrim's job, and the mobile sheet used to add a fourth button for it.
		expect(actions.map((node) => node.getAttribute('aria-label'))).toEqual([
			'Reject All',
			'Accept All',
			'Save Settings',
		]);
		expect(isAccent(tree.container(), 'Accept All')).toBe(false);
		expect(nodeStyle(actions[2] as HTMLElement).borderColor).toBe(
			lightTheme.colors.primary
		);

		tree.unmount();
	});
});

describe('category accordion', () => {
	test('a closed card draws the web height and reaches the tap floor past it', () => {
		const tree = mountSurface(
			<ConsentDialog
				onRequestClose={vi.fn()}
				open
			/>,
			englishSnapshot()
		);
		const row = requireRole(tree.container(), 'button', 'Marketing');
		const card = row.parentElement as HTMLElement;
		const trigger = nodeStyle(row);
		// `.triggerRow` is `padding: 8` over `.trigger`'s `min-height: calc(icon +
		// .25rem)`, which is the disclosure's 20 plus a quarter rem. React Native reads
		// `minHeight` as the border box, so the part carries the padding too: 40 drawn,
		// and 42 once `.item`'s two hairlines are on.
		const drawn = Number(trigger.minHeight);

		expect(trigger.padding).toBe(8);
		expect(drawn).toBe(40);
		expect(nodeStyle(card)).toMatchObject({
			borderRadius: 8,
			borderWidth: 1,
		});
		expect(drawn + 2).toBe(42);

		// The pitch a device measures is that card plus the gap the stack carries: 54,
		// where an inflated card pushed it to 74.
		expect(
			drawn + 2 + Number(nodeStyle(card.parentElement as HTMLElement).gap)
		).toBe(54);

		// Nothing inside the row may hold the touch floor as a laid-out size. The
		// switch used to wrap its track in a 44pt box, which is a touch fact drawn as a
		// layout one: on a 411x914 device every closed card measured 59.8 to 60.2 tall,
		// 44 plus the trigger's padding, because a row is only as tall as the tallest
		// thing in it. The visible control is untouched; its reach is not.
		expect(
			Number(
				nodeStyle(requireRole(tree.container(), 'switch', 'Marketing'))
					.height ?? 0
			)
		).toBeLessThanOrEqual(24);

		// The fingertip still gets the platform minimum, above and below the drawn box.
		const slop = hitSlop(row);

		expect(drawn + slop.top + slop.bottom).toBeGreaterThanOrEqual(
			MIN_TAP_TARGET
		);

		tree.unmount();
	});

	test('keeps the description shut until the row is tapped', () => {
		const tree = mountSurface(
			<ConsentDialog
				onRequestClose={vi.fn()}
				open
			/>,
			englishSnapshot()
		);

		expect(tree.text()).not.toContain(
			'Shows you advertising that is relevant to you.'
		);

		tap(requireRole(tree.container(), 'button', 'Marketing'));

		expect(tree.text()).toContain(
			'Shows you advertising that is relevant to you.'
		);
		expect(
			requireRole(tree.container(), 'button', 'Marketing').getAttribute(
				'aria-expanded'
			)
		).toBe('true');

		tree.unmount();
	});

	test('lets the switch inside the row keep its own tap', () => {
		const tree = mountSurface(
			<ConsentDialog
				onRequestClose={vi.fn()}
				open
			/>,
			englishSnapshot()
		);

		// React Native gives a touch to the innermost responder, so a flip on the
		// switch must not also open the card around it: the two controls share a row
		// and do entirely different jobs.
		tap(requireRole(tree.container(), 'switch', 'Marketing'));

		expect(tree.text()).not.toContain(
			'Shows you advertising that is relevant to you.'
		);
		expect(
			requireRole(tree.container(), 'switch', 'Marketing').getAttribute(
				'aria-checked'
			)
		).toBe('true');

		tree.unmount();
	});

	test('tracks the disclosure glyph in the accordion arrow colour', () => {
		const tree = mountSurface(
			<ConsentDialog
				onRequestClose={vi.fn()}
				open
			/>,
			englishSnapshot()
		);
		const row = requireRole(tree.container(), 'button', 'Marketing');
		const glyph = row.firstElementChild as HTMLElement;
		const bar = nodeStyle(glyph.firstElementChild as HTMLElement);

		// `.arrow` is a 20pt box holding lucide's plus, whose arms are 14 of a 24
		// unit view box at 2 wide, and whose colour is `--accordion-arrow-color`'s
		// fallback: 63.92% lightness, a step lighter than the label it sits beside.
		expect(nodeStyle(glyph)).toMatchObject({ height: 20, width: 20 });
		expect(bar.width).toBeCloseTo(11.667, 2);
		expect(bar.height).toBeCloseTo(1.667, 2);
		expect(bar.backgroundColor).toBe(lightTheme.colors.disclosure);

		tree.unmount();
	});
});

describe('switch thumb', () => {
	test('is a ring that lets the track show through', () => {
		const tree = mountSurface(
			<ConsentDialog
				onRequestClose={vi.fn()}
				open
			/>,
			englishSnapshot()
		);
		const track = requireRole(tree.container(), 'switch', 'Marketing')
			.firstElementChild as HTMLElement;
		const thumb = track.lastElementChild as HTMLElement;
		const dot = nodeStyle(thumb.firstElementChild as HTMLElement);

		// `.thumb::before` is masked out in the middle and `.thumb::after` spreads 1px
		// of the border token around the disc, so the thumb is a ring rather than a
		// filled dot, and the 4pt hole reads as the track colour it sits on.
		expect(dot).toMatchObject({ height: 4, width: 4 });
		expect(dot.backgroundColor).toBe(lightTheme.colors.switchTrack);
		expect(nodeStyle(thumb).boxShadow).toBe(
			`0 0 0 1px ${lightTheme.colors.border}`
		);

		tree.unmount();
	});

	test('flattens the thumb of a category the subject cannot move', () => {
		const tree = mountSurface(
			<ConsentDialog
				onRequestClose={vi.fn()}
				open
			/>,
			englishSnapshot()
		);
		const track = requireRole(tree.container(), 'switch', 'Strictly Necessary')
			.firstElementChild as HTMLElement;
		const thumb = nodeStyle(track.lastElementChild as HTMLElement);

		// `--switch-thumb-size-disabled` is 8 against 10, and the ring is dropped:
		// that, over a track faded to 40%, is the whole reason the required row looks
		// paler than the ones a subject decides.
		expect(thumb).toMatchObject({ height: 8, width: 8 });
		// The whitelist the stub records style through writes absent keys as null.
		expect(thumb.boxShadow).toBeNull();
		expect(nodeStyle(track).opacity).toBe(0.4);

		tree.unmount();
	});
});

describe('banner placement', () => {
	test('sits the gutter above the bottom band, not a control height higher', () => {
		const style = bannerLayerStyle(
			mountSurface(<ConsentBanner />, englishSnapshot()).container()
		);

		// The web card is 16 from the viewport edge and 16 from each side. The
		// mobile layer used to reserve a whole 44pt control on top of the gutter,
		// which floated the card 88 above the bottom of the screen.
		expect(style.paddingBottom).toBe(16);
		expect(style.paddingHorizontal).toBe(16);
		expect(style.position).toBe('absolute');
	});

	test('the card lives inside the absolute layer rather than in the page', () => {
		const tree = mountSurface(<ConsentBanner />, englishSnapshot());
		const layer = tree
			.container()
			.querySelector('[data-pointer-events="box-none"]') as HTMLElement;

		// The regression this guards is the banner laying out inline inside the
		// scrolling page, which moves the app when a policy resolves. A card that
		// is a descendant of an absolutely positioned layer cannot do that.
		expect(nodeStyle(layer).position).toBe('absolute');
		expect(layer.contains(surfaceNode(tree.container()))).toBe(true);

		tree.unmount();
	});
});

describe('branding tab', () => {
	test('carries the padding the phone media query resolves to', () => {
		const tree = mountSurface(<ConsentBanner />, englishSnapshot());
		const style = nodeStyle(
			roleNodes(tree.container(), 'link')[0] as HTMLElement
		);

		// `.brandingTag` asks for `0.28125rem` vertically, and the `max-width: 480px`
		// query that a phone always matches restates it as `0.3125rem`. The web demo
		// at 402 wide measures 5.
		expect(style.paddingVertical ?? style.paddingTop).toBe(5);
		expect(style.paddingHorizontal).toBe(10);

		tree.unmount();
	});
});
