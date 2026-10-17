import { afterEach, describe, expect, test, vi } from 'vitest';

import { flush } from '../../__tests__/helpers/fake-native';
import {
	resetNativeStub,
	setColorScheme,
	setPlatformOS,
} from '../../__tests__/helpers/react-native-stub';
import { resetConsentClient } from '../../native/client';
import { ConsentBanner } from '../consent-banner';
import { ConsentPreferences } from '../consent-preferences';
import {
	CONSENT_THEME_PARTS,
	isConsentThemePart,
} from '../theme/consent-theme-parts';
import {
	createConsentTheme,
	resolveConsentColorScheme,
} from '../theme/create-consent-theme';
import {
	createConsentParts,
	mergeConsentParts,
} from '../theme/use-consent-styles';
import {
	mountSurface,
	nodeStyle,
	requireRole,
	surfaceNode,
	touchHeight,
} from './harness';

afterEach(() => {
	resetConsentClient();
	resetNativeStub();
});

describe('native themes', () => {
	test.each(['ios', 'android'] as const)(
		'%s keeps host overrides on the dark base',
		(platform) => {
			const theme = createConsentTheme({
				colorScheme: 'dark',
				colors: { primary: '#126844' },
				darkColors: { primary: '#68d6a5' },
				platform,
			});
			expect(theme.colors.primary).toBe('#68d6a5');
			expect(theme.colors.background).toBe(
				createConsentTheme({ colorScheme: 'dark', platform }).colors.background
			);
			expect(theme.colors.background).not.toBe(
				createConsentTheme({ platform }).colors.background
			);
		}
	);

	test.each(['ios', 'android'] as const)(
		'%s applies its system chrome and minimum targets',
		(platform) => {
			setPlatformOS(platform);
			const tree = mountSurface(<ConsentBanner />);
			const accept = requireRole(
				tree.container(),
				'button',
				'Alle akzeptieren'
			);
			const reject = requireRole(tree.container(), 'button', 'Alle ablehnen');
			expect(nodeStyle(accept)).toEqual(nodeStyle(reject));
			expect(touchHeight(accept)).toBeGreaterThanOrEqual(
				platform === 'ios' ? 44 : 48
			);
			expect(nodeStyle(surfaceNode(tree.container())).borderTopLeftRadius).toBe(
				platform === 'ios' ? 10 : 28
			);
			tree.unmount();
		}
	);

	test('a system scheme change updates a custom brand without losing its overrides', () => {
		const tree = mountSurface(
			<ConsentPreferences
				onClose={vi.fn()}
				open
				theme={{ colors: { primary: '#126844' } }}
			/>
		);
		const before = nodeStyle(surfaceNode(tree.container())).backgroundColor;
		flush(() => setColorScheme('dark'));
		expect(nodeStyle(surfaceNode(tree.container())).backgroundColor).not.toBe(
			before
		);
		expect(
			nodeStyle(requireRole(tree.container(), 'button', 'Speichern'))
				.backgroundColor
		).toBe('#126844');
		tree.unmount();
	});

	test('an explicit scheme stays fixed when the system changes', () => {
		const tree = mountSurface(
			<ConsentBanner theme={{ colorScheme: 'light' }} />
		);
		const before = nodeStyle(surfaceNode(tree.container()));
		flush(() => setColorScheme('dark'));
		expect(nodeStyle(surfaceNode(tree.container()))).toEqual(before);
		tree.unmount();
	});

	test('host part styles are merged without changing other parts', () => {
		const base = createConsentParts(createConsentTheme());
		const parts = mergeConsentParts(base, {
			button: [{ borderRadius: 3 }, { paddingHorizontal: 30 }],
		});
		expect(parts.button).toMatchObject({
			borderRadius: 3,
			paddingHorizontal: 30,
		});
		expect(parts.navBar).toBe(base.navBar);
		expect(mergeConsentParts(base, undefined)).toBe(base);
		expect(Object.keys(parts).sort()).toEqual([...CONSENT_THEME_PARTS].sort());
	});

	test('part overrides reach the rendered button', () => {
		const tree = mountSurface(
			<ConsentBanner styles={{ button: { borderRadius: 3 } }} />
		);
		expect(
			nodeStyle(requireRole(tree.container(), 'button', 'Alle akzeptieren'))
				.borderRadius
		).toBe(3);
		tree.unmount();
	});

	test('scheme and part names are closed sets', () => {
		expect(resolveConsentColorScheme(null)).toBe('light');
		expect(resolveConsentColorScheme('dark')).toBe('dark');
		expect(resolveConsentColorScheme('unknown')).toBe('light');
		expect(isConsentThemePart('sheet')).toBe(true);
		expect(isConsentThemePart('dialogCard')).toBe(false);
	});
});
