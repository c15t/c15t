import { afterEach, expect, test, vi } from 'vitest';

import { flushPromises } from '../../__tests__/helpers/fake-native';
import {
	linking,
	resetNativeStub,
} from '../../__tests__/helpers/react-native-stub';
import { resetConsentClient } from '../../native/client';
import { ConsentBanner } from '../consent-banner';
import { ConsentPreferences } from '../consent-preferences';
import { ConsentWidget } from '../consent-widget';
import { selectBrandingMark } from '../internal/branding-mark';
import { mountSurface, requireRole, roleNodes, tap } from './harness';

afterEach(() => {
	resetConsentClient();
	resetNativeStub();
});

test('the first layer has no mark; Manage opens the branded preferences list', () => {
	const tree = mountSurface(<ConsentBanner key="banner" />);
	expect(roleNodes(tree.container(), 'link')).toHaveLength(0);
	tap(requireRole(tree.container(), 'button', 'Einstellungen'));
	expect(
		requireRole(tree.container(), 'link', 'Secured by c15t')
	).toBeDefined();
	tree.unmount();
});

test('the footnote opens c15t without writing consent', async () => {
	const tree = mountSurface(<ConsentWidget />);
	tap(requireRole(tree.container(), 'link', 'Secured by c15t'));
	await flushPromises();
	expect(linking.opened).toEqual(['https://c15t.com']);
	expect(tree.fake.commitIntents).toEqual([]);
	tree.unmount();
});

test.each([
	<ConsentWidget
		key="widget"
		hideBranding
	/>,
	<ConsentPreferences
		key="preferences"
		hideBranding
		onClose={vi.fn()}
		open
	/>,
	<ConsentBanner
		key="banner"
		hideBranding
	/>,
])('hideBranding removes the footnote', (surface) => {
	const tree = mountSurface(surface);
	if (surface.type === ConsentBanner) {
		tap(requireRole(tree.container(), 'button', 'Einstellungen'));
	}
	expect(roleNodes(tree.container(), 'link')).toHaveLength(0);
	tree.unmount();
});

test('the embedded mark selects a density variant', () => {
	for (const density of [1, 2, 3]) {
		expect(selectBrandingMark(density)).toMatch(/^data:image\/png;base64,/u);
	}
	expect(selectBrandingMark(1)).not.toBe(selectBrandingMark(3));
});
