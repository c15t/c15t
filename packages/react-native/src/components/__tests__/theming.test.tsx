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
	translatedSnapshot,
} from './harness';

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

describe('theme', () => {
	test('follows the platform scheme', () => {
		setColorScheme('dark');
		const dark = mountSurface(<ConsentBanner />);

		expect(
			nodeStyle(requireRole(dark.container(), 'region', 'Deine Privatsphaere'))
				.backgroundColor
		).toBe(darkTheme.colors.surface);
		dark.unmount();

		setColorScheme('light');
		const light = mountSurface(<ConsentBanner />);

		expect(
			nodeStyle(requireRole(light.container(), 'region', 'Deine Privatsphaere'))
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

	test('a host theme replaces the palette wholesale', () => {
		const tree = mountSurface(
			<ConsentBanner
				theme={createConsentTheme({ colors: { surface: '#123456' } })}
			/>
		);

		expect(
			nodeStyle(requireRole(tree.container(), 'region', 'Deine Privatsphaere'))
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
		expect(resolved.border).toBe(14);

		expect(isConsentThemePart('title')).toBe(true);
		expect(isConsentThemePart('not-a-part')).toBe(false);
	});

	test('large text grows the controls and caps the body', () => {
		setFontScale(1);
		const small = probeFacts();

		expect(small.fontScale).toBe(1);
		expect(small.controlMinHeight).toBe(44);

		setFontScale(2.5);
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
		expect(tree.text()).toContain('Accept all');
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
