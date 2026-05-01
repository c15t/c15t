import { expect, test } from 'bun:test';
import {
	diffA11yTrees,
	normalizeA11ySnapshot,
	type RawA11yNode,
} from './tree-snapshot';

test('normalizeA11ySnapshot collapses whitespace in names', () => {
	const raw: RawA11yNode = {
		role: 'button',
		name: '   Accept   all  cookies  ',
		children: [],
	};
	const n = normalizeA11ySnapshot(raw);
	expect(n.name).toBe('Accept all cookies');
});

test('normalizeA11ySnapshot preserves state flags', () => {
	const raw: RawA11yNode = {
		role: 'switch',
		name: 'Analytics',
		checked: true,
		disabled: false,
	};
	const n = normalizeA11ySnapshot(raw);
	expect(n.state).toEqual({ checked: true, disabled: false });
});

test('diffA11yTrees returns null for identical trees', () => {
	const a = normalizeA11ySnapshot({ role: 'button', name: 'x', children: [] });
	const b = normalizeA11ySnapshot({ role: 'button', name: 'x', children: [] });
	expect(diffA11yTrees(a, b)).toBeNull();
});

test('diffA11yTrees reports role divergence', () => {
	const a = normalizeA11ySnapshot({ role: 'button', name: 'x' });
	const b = normalizeA11ySnapshot({ role: 'link', name: 'x' });
	expect(diffA11yTrees(a, b)).toContain("'button' vs 'link'");
});

test('diffA11yTrees reports name divergence deep in tree', () => {
	const a = normalizeA11ySnapshot({
		role: 'dialog',
		name: 'Preferences',
		children: [
			{
				role: 'button',
				name: 'Save',
			},
		],
	});
	const b = normalizeA11ySnapshot({
		role: 'dialog',
		name: 'Preferences',
		children: [
			{
				role: 'button',
				name: 'Save Changes',
			},
		],
	});
	const diff = diffA11yTrees(a, b);
	expect(diff).toContain('children[0]');
	expect(diff).toContain("'Save' vs 'Save Changes'");
});

test('diffA11yTrees reports state divergence', () => {
	const a = normalizeA11ySnapshot({
		role: 'switch',
		name: 'x',
		checked: true,
	});
	const b = normalizeA11ySnapshot({
		role: 'switch',
		name: 'x',
		checked: false,
	});
	expect(diffA11yTrees(a, b)).toContain('state.checked');
});

test('diffA11yTrees reports differing child counts', () => {
	const a = normalizeA11ySnapshot({
		role: 'group',
		name: 'x',
		children: [{ role: 'button', name: 'a' }],
	});
	const b = normalizeA11ySnapshot({
		role: 'group',
		name: 'x',
		children: [
			{ role: 'button', name: 'a' },
			{ role: 'button', name: 'b' },
		],
	});
	expect(diffA11yTrees(a, b)).toContain('children.length');
});
