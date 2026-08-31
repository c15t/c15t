import { expect, test } from 'bun:test';

import { diffA11yTrees, normalizeA11ySnapshot } from './tree-snapshot';
import type { RawA11yNode } from './tree-snapshot';

test('normalizeA11ySnapshot collapses whitespace in names', () => {
	const raw: RawA11yNode = {
		children: [],
		name: '   Accept   all  cookies  ',
		role: 'button',
	};
	const n = normalizeA11ySnapshot(raw);
	expect(n.name).toBe('Accept all cookies');
});

test('normalizeA11ySnapshot preserves state flags', () => {
	const raw: RawA11yNode = {
		checked: true,
		disabled: false,
		name: 'Analytics',
		role: 'switch',
	};
	const n = normalizeA11ySnapshot(raw);
	expect(n.state).toEqual({ checked: true, disabled: false });
});

test('diffA11yTrees returns null for identical trees', () => {
	const a = normalizeA11ySnapshot({ children: [], name: 'x', role: 'button' });
	const b = normalizeA11ySnapshot({ children: [], name: 'x', role: 'button' });
	expect(diffA11yTrees(a, b)).toBeNull();
});

test('diffA11yTrees reports role divergence', () => {
	const a = normalizeA11ySnapshot({ name: 'x', role: 'button' });
	const b = normalizeA11ySnapshot({ name: 'x', role: 'link' });
	expect(diffA11yTrees(a, b)).toContain("'button' vs 'link'");
});

test('diffA11yTrees reports name divergence deep in tree', () => {
	const a = normalizeA11ySnapshot({
		children: [
			{
				name: 'Save',

				role: 'button',
			},
		],
		name: 'Preferences',
		role: 'dialog',
	});
	const b = normalizeA11ySnapshot({
		children: [
			{
				name: 'Save Changes',

				role: 'button',
			},
		],
		name: 'Preferences',
		role: 'dialog',
	});
	const diff = diffA11yTrees(a, b);
	expect(diff).toContain('children[0]');
	expect(diff).toContain("'Save' vs 'Save Changes'");
});

test('diffA11yTrees reports state divergence', () => {
	const a = normalizeA11ySnapshot({
		checked: true,
		name: 'x',
		role: 'switch',
	});
	const b = normalizeA11ySnapshot({
		checked: false,
		name: 'x',
		role: 'switch',
	});
	expect(diffA11yTrees(a, b)).toContain('state.checked');
});

test('diffA11yTrees reports differing child counts', () => {
	const a = normalizeA11ySnapshot({
		children: [{ name: 'a', role: 'button' }],
		name: 'x',
		role: 'group',
	});
	const b = normalizeA11ySnapshot({
		children: [
			{ name: 'a', role: 'button' },
			{ name: 'b', role: 'button' },
		],
		name: 'x',
		role: 'group',
	});
	expect(diffA11yTrees(a, b)).toContain('children.length');
});
