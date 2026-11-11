import type { ReactElement } from 'react';
import { afterEach, expect, test, vi } from 'vitest';

import {
	createFakeNativeModule,
	renderTree,
} from '../../__tests__/helpers/fake-native';
import {
	resetNativeStub,
	setPlatformOS,
	setStatusBarHeight,
} from '../../__tests__/helpers/react-native-stub';
import {
	RESERVED_BOTTOM_INSET,
	resolveConsentSafeArea,
} from '../../hooks/use-consent-safe-area';
import { resetConsentClient } from '../../native/client';
import { C15tProvider } from '../../provider/c15t-provider';
import { ConsentBanner } from '../consent-banner';
import { ConsentPreferences } from '../consent-preferences';
import { nodeStyle, surfaceNode, translatedSnapshot } from './harness';

const PORTRAIT = { bottom: 34, left: 0, right: 0, top: 59 };
const LANDSCAPE = { bottom: 21, left: 59, right: 59, top: 0 };

afterEach(() => {
	resetConsentClient();
	resetNativeStub();
});

test.each([
	['banner', <ConsentBanner key="banner" />],
	[
		'page',
		<ConsentPreferences
			key="page"
			onClose={vi.fn()}
			open
		/>,
	],
	[
		'sheet',
		<ConsentPreferences
			key="sheet"
			onClose={vi.fn()}
			open
			presentation="sheet"
		/>,
	],
] as const)(
	'%s keeps controls clear of changing measured insets',
	(_name, surface: ReactElement) => {
		createFakeNativeModule({ snapshot: translatedSnapshot() });
		const tree = renderTree(
			<C15tProvider safeAreaInsets={PORTRAIT}>{surface}</C15tProvider>
		);
		expect(nodeStyle(surfaceNode(tree.container())).paddingBottom).toBe(
			PORTRAIT.bottom
		);
		tree.rerender(
			<C15tProvider safeAreaInsets={LANDSCAPE}>{surface}</C15tProvider>
		);
		const style = nodeStyle(surfaceNode(tree.container()));
		expect(style.paddingBottom).toBe(LANDSCAPE.bottom);
		expect(style.paddingLeft).toBe(LANDSCAPE.left);
		expect(style.paddingRight).toBe(LANDSCAPE.right);
		tree.unmount();
	}
);

test('Android pages reserve the measured status bar', () => {
	setPlatformOS('android');
	createFakeNativeModule({ snapshot: translatedSnapshot() });
	const tree = renderTree(
		<C15tProvider safeAreaInsets={PORTRAIT}>
			<ConsentPreferences
				key="page"
				onClose={vi.fn()}
				open
			/>
		</C15tProvider>
	);
	expect(nodeStyle(surfaceNode(tree.container())).paddingTop).toBe(
		PORTRAIT.top
	);
	tree.unmount();
});

test('unmeasured insets reserve the bottom and the Android status bar', () => {
	setPlatformOS('android');
	setStatusBarHeight(24);
	expect(resolveConsentSafeArea(null)).toMatchObject({
		bottom: RESERVED_BOTTOM_INSET,
		measured: false,
		top: 24,
	});
});

test('invalid measured insets are clamped', () => {
	expect(
		resolveConsentSafeArea({
			bottom: -1,
			left: Number.NaN,
			right: Number.POSITIVE_INFINITY,
			top: 0,
		})
	).toEqual({ bottom: 0, left: 0, measured: true, right: 0, top: 0 });
});
