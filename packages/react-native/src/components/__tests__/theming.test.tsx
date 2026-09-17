/**
 * Theming, platform adaptation, and the plumbing under the sheets.
 *
 * These reach past the three public surfaces into the shared ones, because the
 * theme and the back gesture are what a host app relies on once it builds its
 * own layout out of the same parts.
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
	captureErrorMessage,
	flush,
	flushPromises,
} from '../../__tests__/helpers/fake-native';
import {
	animationState,
	pressBack,
	resetNativeStub,
	setColorScheme,
	setFontScale,
	setPlatformOS,
	setReduceMotion,
} from '../../__tests__/helpers/react-native-stub';
import { resetConsentClient } from '../../native/client';
import { ConsentBanner } from '../consent-banner';
import { ConsentDialog } from '../consent-dialog';
import {
	ConsentSurface,
	ConsentSurfaceBody,
	ConsentSurfaceHeader,
} from '../internal/consent-surface';
import type { ConsentPartStyles } from '../theme/consent-theme-parts';
import { isConsentThemePart } from '../theme/consent-theme-parts';
import {
	createConsentTheme,
	darkTheme,
	lightTheme,
	resolveConsentColorScheme,
} from '../theme/create-consent-theme';
import type { ConsentTheme } from '../theme/create-consent-theme';
import { useConsentStyles } from '../theme/use-consent-styles';
import {
	mountSurface,
	nodeStyle,
	requireRole,
	roleNodes,
	surfaceNode,
	translatedSnapshot,
} from './harness';
import type { SurfaceTree } from './harness';

afterEach(() => {
	resetConsentClient();
	resetNativeStub();
});

/**
 * The style facts a probe render reports.
 *
 * Reported as text rather than through a variable the component writes, because
 * writing to something outside the component during render is exactly the side
 * effect React forbids.
 */
interface ProbeFacts {
	/** Corner radius the sheet resolved to. */
	border: number;
	/** Smallest height a control may take. */
	controlMinHeight: number;
	/** Effective font scale. */
	fontScale: number;
	/** Height the body may reach. */
	maxBodyHeight: number;
	/** Scheme the palette came from. */
	scheme: string;
	/** Color the title part resolved to. */
	titleColor: string;
	/** Weight the title part resolved to. */
	titleWeight: string;
}

/** Render the style resolution a surface would use, as readable text. */
const StylesProbe = (props: {
	readonly styles?: ConsentPartStyles;
	readonly theme?: ConsentTheme;
}): ReactNode => {
	const { controlMinHeight, fontScale, maxBodyHeight, parts, scheme } =
		useConsentStyles({ styles: props.styles, theme: props.theme });
	const facts: ProbeFacts = {
		border: parts.sheet.borderRadius ?? 0,
		controlMinHeight,
		fontScale,
		maxBodyHeight,
		scheme,
		titleColor: String(parts.title.color ?? ''),
		titleWeight: String(parts.title.fontWeight ?? ''),
	};

	return <Text>{JSON.stringify(facts)}</Text>;
};

/** Resolve styles for a host's theme and overrides. */
const probeFacts = function probeFacts(
	props: {
		readonly styles?: ConsentPartStyles;
		readonly theme?: ConsentTheme;
	} = {}
): ProbeFacts {
	const tree = mountSurface(<StylesProbe {...props} />);
	const facts = JSON.parse(tree.text()) as ProbeFacts;

	tree.unmount();

	return facts;
};

/** Render a bare banner layer through the shared surface, as a host would. */
const HostBanner = ({
	onRequestClose,
}: {
	readonly onRequestClose?: () => void;
}): ReactNode => {
	const surface = useConsentStyles({});

	return (
		<ConsentSurface
			label="Host sheet"
			onRequestClose={onRequestClose}
			open
			presentation="banner"
			styles={surface}
		>
			<ConsentSurfaceHeader>
				<Text>Heading</Text>
			</ConsentSurfaceHeader>
			<ConsentSurfaceBody>
				<Text>Body</Text>
			</ConsentSurfaceBody>
		</ConsentSurface>
	);
};

/** Tap the switch for one category label. */
const tapSwitch = function tapSwitch(
	container: HTMLElement,
	label: string
): void {
	requireRole(container, 'switch', label).click();
};

/**
 * The style one piece of rendered text was drawn with.
 *
 * The banner keeps its copy in the scrolling body and the sheet keeps its beside
 * the heading, so reading a role's sibling would only work for one of them.
 *
 * @param tree - Mounted surface.
 * @param text - The exact string on screen.
 * @returns The flattened style of the text node.
 */
const textStyleOf = function textStyleOf(
	tree: SurfaceTree,
	text: string
): Record<string, unknown> {
	const drawn = [...tree.container().querySelectorAll('span')].find(
		(node) => node.textContent === text
	);

	if (drawn === undefined) {
		throw new Error(`no rendered text ${text}`);
	}

	return nodeStyle(drawn);
};

describe('theme', () => {
	test('follows the platform scheme', () => {
		setColorScheme('dark');
		const dark = mountSurface(<ConsentBanner />);

		expect(
			nodeStyle(surfaceNode(dark.container(), 'Deine Privatsphaere'))
				.backgroundColor
		).toBe(darkTheme.colors.surface);
		dark.unmount();

		setColorScheme('light');
		const light = mountSurface(<ConsentBanner />);

		expect(
			nodeStyle(surfaceNode(light.container(), 'Deine Privatsphaere'))
				.backgroundColor
		).toBe(lightTheme.colors.surface);
		light.unmount();
	});

	test('an unset scheme reads light', () => {
		expect(resolveConsentColorScheme(null)).toBe('light');
		expect(resolveConsentColorScheme(undefined)).toBe('light');
		expect(resolveConsentColorScheme('light')).toBe('light');
		expect(resolveConsentColorScheme('dark')).toBe('dark');
		expect(createConsentTheme().colors.surface).toBe('#FFFFFF');
	});

	test('the built-in palettes carry the web tokens', () => {
		// The values are the ones `packages/ui` ships, so the banner a subject saw
		// in a browser and the banner they see in the app are one design. The
		// accent is the point of the exercise: it used to be near-black.
		expect(lightTheme.colors.primary).toBe('#335CFF');
		expect(lightTheme.colors.switchTrackOn).toBe('#335CFF');
		expect(lightTheme.colors.text).toBe('#1A1A1A');
		expect(lightTheme.colors.textMuted).toBe('#666666');
		expect(lightTheme.colors.border).toBe('#E6E6E6');
		expect(lightTheme.colors.surfaceRaised).toBe('#FAFAFA');
		expect(darkTheme.colors.primary).toBe('#6685FF');

		// The branding tab is filled with the accent, so web outlines it with the
		// accent 14% toward black. React Native has no `color-mix` to run at render,
		// so the resolved literal is the token: 0.86 of each channel.
		expect(lightTheme.colors.primaryBorder).toBe('#2C4FDB');
		expect(darkTheme.colors.primaryBorder).toBe('#5872DB');

		// 4 8 16 24 32, the web step scale.
		expect(lightTheme.spacing).toEqual({ l: 24, m: 16, s: 8, xl: 32, xs: 4 });
		expect(lightTheme.radius).toEqual({ control: 8, surface: 12 });

		// A button label is 14 at medium on the web tight line, and the sheet
		// pairs a 14 semibold heading, set tight at 1, over 16 regular copy.
		expect(lightTheme.typography.body).toEqual({
			fontSize: 16,
			lineHeight: 24,
			weight: '400',
		});
		expect(lightTheme.typography.label).toEqual({
			fontSize: 14,
			lineHeight: 17.5,
			weight: '500',
		});
		expect(lightTheme.typography.title).toEqual({
			fontSize: 14,
			lineHeight: 14,
			weight: '600',
		});

		// The banner inverts that: `.title` is `1rem` over a `0.875rem`
		// description, so the heading leads the copy.
		expect(lightTheme.typography.bannerTitle).toEqual({
			fontSize: 16,
			lineHeight: 24,
			weight: '500',
		});
		expect(lightTheme.typography.bannerBody).toEqual({
			fontSize: 14,
			lineHeight: 20,
			weight: '400',
		});

		// The neutral outline reads `border` and `text`, so the filled pair that
		// would have served a solid button is gone rather than parked.
		expect(lightTheme.colors).not.toHaveProperty('secondary');
		expect(lightTheme.colors).not.toHaveProperty('onSecondary');
		expect(darkTheme.colors).not.toHaveProperty('secondary');
	});

	test('the banner heading leads its copy and the sheet heading follows its', () => {
		// One shared pair can only be right about one of these surfaces, which is
		// what put a 14 heading under 16 copy on the banner in the first place.
		const banner = mountSurface(<ConsentBanner />);

		expect(textStyleOf(banner, 'Deine Privatsphaere')).toMatchObject({
			fontSize: 16,
			fontWeight: '500',
		});
		expect(textStyleOf(banner, 'Wir verarbeiten deine Daten.')).toMatchObject({
			fontSize: 14,
			fontWeight: '400',
		});

		const sheet = mountSurface(
			<ConsentDialog
				onRequestClose={vi.fn()}
				open
			/>
		);

		expect(textStyleOf(sheet, 'Zustimmung verwalten')).toMatchObject({
			fontSize: 14,
			fontWeight: '600',
		});
		expect(
			textStyleOf(sheet, 'Waehle die Kategorien, die du erlaubst.')
		).toMatchObject({
			fontSize: 16,
			fontWeight: '400',
		});

		banner.unmount();
		sheet.unmount();
	});

	test('a category is a bordered card and the list owns the gap', () => {
		const tree = mountSurface(
			<ConsentDialog
				onRequestClose={vi.fn()}
				open
			/>
		);

		const card = requireRole(tree.container(), 'switch', 'Werbung')
			.parentElement as HTMLElement;

		// `.item` is a card in its own border, not a row between two dividers.
		expect(nodeStyle(card)).toMatchObject({
			backgroundColor: lightTheme.colors.surface,
			borderColor: lightTheme.colors.border,
			borderRadius: lightTheme.radius.control,
			borderWidth: 1,
			gap: 4,
			padding: 8,
		});

		// The separation sits between the cards rather than on one of them, so the
		// last card does not push the footer down by an extra step.
		const list = card.parentElement as HTMLElement;

		expect(nodeStyle(list).gap).toBe(12);
		expect(list.children.length).toBe(5);

		tree.unmount();
	});

	test('each footer keeps the rhythm of its own surface', () => {
		const banner = mountSurface(<ConsentBanner />);
		const bannerFooter = surfaceNode(banner.container())
			.lastElementChild as HTMLElement;

		// `1rem 1.25rem` on `.footer`, on the muted band, under a hairline.
		expect(nodeStyle(bannerFooter)).toMatchObject({
			backgroundColor: lightTheme.colors.surfaceRaised,
			borderTopColor: lightTheme.colors.border,
			borderTopWidth: 1,
			gap: 16,
			paddingHorizontal: 20,
			paddingVertical: 16,
		});

		const sheet = mountSurface(
			<ConsentDialog
				onRequestClose={vi.fn()}
				open
			/>
		);
		const sheetFooter = surfaceNode(sheet.container())
			.lastElementChild as HTMLElement;

		// A sheet sits on the card at 16 all round with the shorter step.
		expect(nodeStyle(sheetFooter)).toMatchObject({
			backgroundColor: lightTheme.colors.surface,
			borderTopWidth: 1,
			gap: 8,
			paddingHorizontal: 16,
			paddingVertical: 16,
		});

		banner.unmount();
		sheet.unmount();
	});

	test('a button is padded by its label and sized by the tap target', () => {
		const tree = mountSurface(<ConsentBanner />);
		const action = nodeStyle(
			requireRole(tree.container(), 'button', 'Alle akzeptieren')
		);

		// `0.625rem 1rem`, and the platform minimum still decides the height.
		expect(action.paddingVertical).toBe(10);
		expect(action.paddingHorizontal).toBe(16);
		expect(action.minHeight).toBeGreaterThanOrEqual(44);

		tree.unmount();
	});

	test('the switch is the web track inside a platform tap target', async () => {
		const tree = mountSurface(
			<ConsentDialog
				onRequestClose={vi.fn()}
				open
			/>
		);

		await flushPromises();

		// The 28x16 fully rounded track the consent surfaces ask the primitive
		// for, rather than the native control tinted to look near it. The thumb
		// lives inside the track's own padding.
		const trackStyle = () =>
			nodeStyle(
				requireRole(tree.container(), 'switch', 'Werbung')
					.firstElementChild as HTMLElement
			);

		expect(trackStyle()).toMatchObject({
			borderRadius: 8,
			height: 16,
			padding: 2,
			width: 28,
		});

		// The visible control is small; the finger still gets the platform minimum.
		expect(
			nodeStyle(requireRole(tree.container(), 'switch', 'Werbung')).height
		).toBe(44);

		expect(trackStyle().backgroundColor).toBe(lightTheme.colors.switchTrack);

		flush(() => {
			tapSwitch(tree.container(), 'Werbung');
		});

		expect(
			requireRole(tree.container(), 'switch', 'Werbung').getAttribute(
				'aria-checked'
			)
		).toBe('true');
		expect(trackStyle().backgroundColor).toBe(lightTheme.colors.switchTrackOn);

		tree.unmount();
	});

	test('the branding tab is the web tag, and a host can restyle it', () => {
		const tree = mountSurface(<ConsentBanner />);

		// `0.6875rem` at `line-height: 1`, so the line box is the font size rather
		// than a step on the type scale. It is the one piece of text in a consent
		// surface that is not the subject's own language.
		expect(textStyleOf(tree, 'Secured by')).toEqual(
			expect.objectContaining({
				color: lightTheme.colors.onPrimary,
				fontSize: 11,
				lineHeight: 11,
			})
		);

		expect(
			nodeStyle(roleNodes(tree.container(), 'link')[0] as HTMLElement).gap
		).toBe(6);
		tree.unmount();

		const styled = mountSurface(
			<ConsentBanner styles={{ branding: { backgroundColor: '#010203' } }} />
		);

		expect(
			nodeStyle(roleNodes(styled.container(), 'link')[0] as HTMLElement)
				.backgroundColor
		).toBe('#010203');
		styled.unmount();
	});

	test('a host theme replaces the palette wholesale', () => {
		const tree = mountSurface(
			<ConsentBanner
				theme={createConsentTheme({ colors: { surface: '#123456' } })}
			/>
		);

		expect(
			nodeStyle(surfaceNode(tree.container(), 'Deine Privatsphaere'))
				.backgroundColor
		).toBe('#123456');

		tree.unmount();
	});

	test('a per-part override beats the theme', () => {
		const styles: ConsentPartStyles = { title: { color: '#AA0000' } };
		const tree = mountSurface(<ConsentBanner styles={styles} />);

		expect(nodeStyle(requireRole(tree.container(), 'header')).color).toBe(
			'#AA0000'
		);

		tree.unmount();
	});

	test('array overrides flatten and unknown parts are dropped', () => {
		// A host writing plain JavaScript has nothing stopping it from naming a
		// part that does not exist, so the map has to survive that.
		const styles = {
			'not-a-part': { color: '#00FF00' },
			title: [{ color: '#0000AA' }, false, { fontWeight: '700' }],
		} as ConsentPartStyles;
		const resolved = probeFacts({ styles });

		expect(resolved.titleColor).toBe('#0000AA');
		expect(resolved.titleWeight).toBe('700');
		expect(resolved.border).toBe(12);

		expect(isConsentThemePart('title')).toBe(true);
		expect(isConsentThemePart('not-a-part')).toBe(false);
	});

	test('large text grows the controls and caps the body', () => {
		setFontScale(1);
		const small = probeFacts();

		expect(small.fontScale).toBe(1);
		expect(small.controlMinHeight).toBe(44);

		// Three times the default, which is the smallest scale where the label's
		// own line box is what clears the platform minimum rather than merely
		// reaching it.
		setFontScale(3);
		const large = probeFacts();

		expect(large.controlMinHeight).toBeGreaterThan(44);
		// The body gives up screen height rather than pushing the footer off it.
		expect(large.maxBodyHeight).toBeLessThan(844);

		setFontScale(8);

		// Beyond a scale this package can lay out, it sizes for the largest one
		// it knows instead of building something unrenderable.
		expect(probeFacts().fontScale).toBe(3.5);
	});

	test('a host theme is used exactly as given', () => {
		const theme = createConsentTheme({
			radius: { surface: 2 },
			spacing: { l: 4 },
		});
		const resolved = probeFacts({ theme });

		expect(resolved.border).toBe(2);
		expect(resolved.scheme).toBe('light');
	});
});

describe('platform behaviour', () => {
	test('the Android back gesture closes a sheet that can close', () => {
		setPlatformOS('android');
		const onRequestClose = vi.fn();
		const tree = mountSurface(<HostBanner onRequestClose={onRequestClose} />);

		expect(pressBack()).toBe(true);
		expect(onRequestClose).toHaveBeenCalledTimes(1);

		tree.unmount();
	});

	test('a sheet with no exit leaves the back gesture to the app', () => {
		setPlatformOS('android');
		const tree = mountSurface(<HostBanner />);

		expect(pressBack()).toBe(false);

		tree.unmount();
	});

	test('iOS never takes the back gesture', () => {
		setPlatformOS('ios');
		const onRequestClose = vi.fn();
		const tree = mountSurface(<HostBanner onRequestClose={onRequestClose} />);

		expect(pressBack()).toBe(false);
		expect(onRequestClose).not.toHaveBeenCalled();

		tree.unmount();
	});

	test('a late reduce-motion request takes over the running animation', async () => {
		const tree = mountSurface(<ConsentBanner />);

		await flushPromises();
		expect(animationState.durations).toEqual([260]);

		flush(() => {
			setReduceMotion(true);
		});
		await flushPromises();

		expect(animationState.durations).toContain(1);
		expect(animationState.jsDriverStarts).toBe(0);

		tree.unmount();
	});

	test('the sheet content refuses to render outside a surface', () => {
		const message = captureErrorMessage(() => {
			mountSurface(<ConsentSurfaceHeader>orphan</ConsentSurfaceHeader>);
		});

		expect(message).toContain('ConsentBanner');
	});
});

describe('copy and scope changes', () => {
	test('new copy replaces what is on screen', async () => {
		const tree = mountSurface(<ConsentBanner />);

		await flushPromises();
		tree.resetCommits();

		flush(() => {
			tree.fake.pushSnapshot(
				translatedSnapshot({
					revision: 5,
					translations: {
						language: 'de',
						translations: {
							cookieBanner: {
								description: 'Neue Beschreibung.',
								title: 'Neue Ueberschrift',
							},
						},
					},
				})
			);
		});
		await flushPromises();

		expect(tree.text()).toContain('Neue Beschreibung.');
		// The group the bundle left out falls back instead of going blank.
		expect(tree.text()).toContain('Accept All');
		expect(tree.commits()).toBe(1);

		tree.unmount();
	});

	test('a narrowed scope drops rows from an open sheet', async () => {
		const tree = mountSurface(
			<ConsentDialog
				onRequestClose={vi.fn()}
				open
			/>
		);

		await flushPromises();
		expect(roleNodes(tree.container(), 'switch')).toHaveLength(5);

		flush(() => {
			tree.fake.pushSnapshot(
				translatedSnapshot({
					consentCategories: ['necessary', 'measurement'],
					revision: 6,
				})
			);
		});
		await flushPromises();

		expect(roleNodes(tree.container(), 'switch')).toHaveLength(2);
		expect(tree.text()).toContain('Messung');
		expect(tree.text()).not.toContain('Werbung');

		tree.unmount();
	});

	test('an unrelated grant moves a switch the subject never touched', async () => {
		const tree = mountSurface(
			<ConsentDialog
				onRequestClose={vi.fn()}
				open
			/>
		);

		await flushPromises();

		expect(
			requireRole(tree.container(), 'switch', 'Werbung').getAttribute(
				'aria-checked'
			)
		).toBe('false');

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
					revision: 7,
				})
			);
		});
		await flushPromises();

		expect(
			requireRole(tree.container(), 'switch', 'Werbung').getAttribute(
				'aria-checked'
			)
		).toBe('true');
		// A row the subject has not touched follows the policy.
		tapSwitch(tree.container(), 'Messung');

		expect(
			requireRole(tree.container(), 'switch', 'Messung').getAttribute(
				'aria-checked'
			)
		).toBe('true');

		tree.unmount();
	});
});

describe('closing', () => {
	test('a sheet that was never opened holds no category list', async () => {
		const ToggleHost = (): ReactNode => {
			const [open, setOpen] = useState(false);

			return (
				<ConsentDialog
					onRequestClose={() => {
						setOpen(false);
					}}
					open={open}
				/>
			);
		};

		const tree = mountSurface(<ToggleHost />);

		await flushPromises();
		expect(roleNodes(tree.container(), 'switch')).toEqual([]);

		// A shut sheet holds no subscription either, so a grant costs it nothing.
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
					revision: 8,
				})
			);
		});
		await flushPromises();

		expect(roleNodes(tree.container(), 'switch')).toEqual([]);

		tree.unmount();
	});
});
