import type { ReactElement } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { resetNativeStub } from '../../__tests__/helpers/react-native-stub';
import { resetConsentClient } from '../../native/client';
import { ConsentBanner } from '../consent-banner';
import { ConsentPreferences } from '../consent-preferences';
import { ConsentWidget } from '../consent-widget';
import { mountSurface, roleNodes, surfaceNode } from './harness';

// Android rejects unknown accessibilityRole values; dialog uses the ARIA role prop.
const ANDROID_ROLES = new Set([
	'button',
	'header',
	'image',
	'link',
	'switch',
	'tab',
	'tablist',
	'text',
]);
const SURFACES: readonly [string, () => ReactElement][] = [
	['banner', () => <ConsentBanner />],
	[
		'page',
		() => (
			<ConsentPreferences
				onClose={vi.fn()}
				open
			/>
		),
	],
	[
		'sheet',
		() => (
			<ConsentPreferences
				onClose={vi.fn()}
				open
				presentation="sheet"
			/>
		),
	],
	['widget', () => <ConsentWidget />],
];

afterEach(() => {
	resetConsentClient();
	resetNativeStub();
});

describe('native accessibility roles', () => {
	test.each(SURFACES)(
		'%s uses supported Android roles and labels controls',
		(_name, surface) => {
			const tree = mountSurface(surface());
			for (const node of tree.container().querySelectorAll('[data-rn-role]')) {
				expect(ANDROID_ROLES.has(node.getAttribute('data-rn-role') ?? '')).toBe(
					true
				);
			}
			for (const role of ['button', 'link', 'switch']) {
				for (const node of roleNodes(tree.container(), role)) {
					expect(node.getAttribute('aria-label')).toBeTruthy();
				}
			}
			tree.unmount();
		}
	);

	test('the first layer is a modal dialog with three decision buttons', () => {
		const tree = mountSurface(<ConsentBanner />);
		expect(surfaceNode(tree.container()).getAttribute('role')).toBe('dialog');
		expect(roleNodes(tree.container(), 'button')).toHaveLength(3);
		expect(roleNodes(tree.container(), 'link')).toHaveLength(0);
		expect(
			tree.container().querySelector('[data-rn-role="dialog"]')
		).toBeNull();
		tree.unmount();
	});

	test('each category exposes one switch to assistive technology', () => {
		const tree = mountSurface(<ConsentWidget />);
		expect(roleNodes(tree.container(), 'switch')).toHaveLength(5);
		expect(
			roleNodes(tree.container(), 'switch').every((node) =>
				node.hasAttribute('aria-checked')
			)
		).toBe(true);
		tree.unmount();
	});
});
