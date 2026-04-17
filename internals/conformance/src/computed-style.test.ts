import { beforeEach, expect, test } from 'bun:test';
import {
	captureComputedStyle,
	captureComputedStyleFor,
	diffComputedStyle,
	diffComputedStyleMap,
} from './computed-style';

beforeEach(() => {
	document.body.innerHTML = '';
	for (const existing of document.head.querySelectorAll('style')) {
		existing.remove();
	}
});

function applyStyle(css: string): void {
	const style = document.createElement('style');
	style.textContent = css;
	document.head.append(style);
}

test('captures configured properties', () => {
	applyStyle('.box { display: flex; color: rgb(10, 20, 30); }');
	const el = document.createElement('div');
	el.className = 'box';
	document.body.append(el);

	const snap = captureComputedStyle(el, { properties: ['display', 'color'] });
	expect(snap.properties.display).toBe('flex');
	expect(snap.properties.color).toContain('10');
});

test('captures CSS custom properties when enabled', () => {
	applyStyle('.box { --theme-primary: #abc; --theme-radius: 8px; }');
	const el = document.createElement('div');
	el.className = 'box';
	document.body.append(el);

	const snap = captureComputedStyle(el, { properties: [] });
	expect(snap.customProperties['--theme-primary']).toBe('#abc');
	expect(snap.customProperties['--theme-radius']).toBe('8px');
});

test('skips custom properties when captureCustomProperties is false', () => {
	applyStyle('.box { --theme: red; }');
	const el = document.createElement('div');
	el.className = 'box';
	document.body.append(el);

	const snap = captureComputedStyle(el, {
		properties: [],
		captureCustomProperties: false,
	});
	expect(snap.customProperties).toEqual({});
});

test('diffComputedStyle returns empty for identical snapshots', () => {
	const a = {
		properties: { color: 'red', display: 'flex' },
		customProperties: { '--x': '1' },
	};
	const b = {
		properties: { color: 'red', display: 'flex' },
		customProperties: { '--x': '1' },
	};
	expect(diffComputedStyle(a, b)).toEqual([]);
});

test('diffComputedStyle reports property divergences', () => {
	const a = {
		properties: { color: 'red' },
		customProperties: {},
	};
	const b = {
		properties: { color: 'blue' },
		customProperties: {},
	};
	const diffs = diffComputedStyle(a, b, 'my-id');
	expect(diffs).toHaveLength(1);
	expect(diffs[0]).toMatchObject({
		path: 'my-id',
		kind: 'property',
		name: 'color',
		a: 'red',
		b: 'blue',
	});
});

test('diffComputedStyle reports custom property divergences', () => {
	const a = {
		properties: {},
		customProperties: { '--theme': 'dark' },
	};
	const b = {
		properties: {},
		customProperties: { '--theme': 'light' },
	};
	const diffs = diffComputedStyle(a, b);
	expect(diffs).toHaveLength(1);
	expect(diffs[0]?.kind).toBe('custom-property');
	expect(diffs[0]?.name).toBe('--theme');
});

test('diffComputedStyle reports missing property on one side', () => {
	const a = {
		properties: { color: 'red', display: 'flex' },
		customProperties: {},
	};
	const b = {
		properties: { color: 'red' },
		customProperties: {},
	};
	const diffs = diffComputedStyle(a, b);
	expect(diffs).toHaveLength(1);
	expect(diffs[0]?.name).toBe('display');
	expect(diffs[0]?.b).toBeUndefined();
});

test('captureComputedStyleFor picks elements by test-id', () => {
	document.body.innerHTML =
		'<div data-testid="a"></div><div data-testid="b"></div>';
	const snap = captureComputedStyleFor(document.body, ['a', 'b'], {
		properties: ['display'],
		captureCustomProperties: false,
	});
	expect(Object.keys(snap).sort()).toEqual(['a', 'b']);
});

test('captureComputedStyleFor skips missing test-ids', () => {
	document.body.innerHTML = '<div data-testid="a"></div>';
	const snap = captureComputedStyleFor(document.body, ['a', 'missing'], {
		properties: ['display'],
		captureCustomProperties: false,
	});
	expect(Object.keys(snap)).toEqual(['a']);
});

test('diffComputedStyleMap reports missing keys as presence diffs', () => {
	const a = {
		'testid-a': {
			properties: { color: 'red' },
			customProperties: {},
		},
	};
	const b = {};
	const diffs = diffComputedStyleMap(a, b);
	expect(diffs).toHaveLength(1);
	expect(diffs[0]?.name).toBe('<presence>');
	expect(diffs[0]?.path).toBe('testid-a');
	expect(diffs[0]?.a).toBe('present');
	expect(diffs[0]?.b).toBeUndefined();
});

test('diffComputedStyleMap carries test-id into path of nested diffs', () => {
	const a = {
		'testid-a': {
			properties: { color: 'red' },
			customProperties: {},
		},
	};
	const b = {
		'testid-a': {
			properties: { color: 'blue' },
			customProperties: {},
		},
	};
	const diffs = diffComputedStyleMap(a, b);
	expect(diffs).toHaveLength(1);
	expect(diffs[0]?.path).toBe('testid-a');
	expect(diffs[0]?.name).toBe('color');
});
