import { beforeEach, expect, test } from 'bun:test';
import {
	canonicalizeStyleValue,
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

// ---------------------------------------------------------------------------
// Value canonicalization
// ---------------------------------------------------------------------------

test('canonicalizeStyleValue normalizes hex shorthand to rgb', () => {
	expect(canonicalizeStyleValue('color', '#abc')).toBe('rgb(170, 187, 204)');
});

test('canonicalizeStyleValue normalizes 6-digit hex to rgb', () => {
	expect(canonicalizeStyleValue('color', '#5c5c5c')).toBe('rgb(92, 92, 92)');
});

test('canonicalizeStyleValue normalizes 8-digit hex to rgba', () => {
	expect(canonicalizeStyleValue('color', '#ff000080')).toBe(
		'rgba(255, 0, 0, 0.5019607843137255)'
	);
});

test('canonicalizeStyleValue treats equivalent hex and hsl as equal', () => {
	// #5c5c5c == hsl(0, 0%, 36.08%) (approximately)
	const fromHex = canonicalizeStyleValue('color', '#5c5c5c');
	const fromHsl = canonicalizeStyleValue('color', 'hsl(0, 0%, 36.08%)');
	expect(fromHex).toBe(fromHsl);
});

test('canonicalizeStyleValue handles rgba round-trip', () => {
	expect(canonicalizeStyleValue('color', 'rgba(0, 0, 0, 0.5)')).toBe(
		'rgba(0, 0, 0, 0.5)'
	);
});

test('canonicalizeStyleValue treats hsla and rgba as equal when equivalent', () => {
	const fromRgba = canonicalizeStyleValue('color', 'rgba(37, 71, 208, 1)');
	const fromHsla = canonicalizeStyleValue(
		'color',
		'hsla(228.07, 69.8%, 48.04%, 1)'
	);
	expect(fromRgba).toBe(fromHsla);
});

test('canonicalizeStyleValue leaves named colors alone', () => {
	expect(canonicalizeStyleValue('color', 'transparent')).toBe('transparent');
	expect(canonicalizeStyleValue('color', 'currentColor')).toBe('currentColor');
});

test('canonicalizeStyleValue canonicalizes custom-property colors', () => {
	const fromHex = canonicalizeStyleValue(
		'--consent-widget-accordion-focus-ring-dark',
		'#2547d0'
	);
	const fromHsl = canonicalizeStyleValue(
		'--consent-widget-accordion-focus-ring-dark',
		'hsl(228.07, 69.8%, 48.04%)'
	);
	expect(fromHex).toBe(fromHsl);
});

test('canonicalizeStyleValue replaces animation-name with placeholder', () => {
	expect(canonicalizeStyleValue('animation-name', '_enter_7n8gw_1')).toBe(
		'<anim>'
	);
	expect(canonicalizeStyleValue('animation-name', 'c15t-ui-enter-oqaf_')).toBe(
		'<anim>'
	);
});

test('canonicalizeStyleValue strips animation name from shorthand, keeps timing', () => {
	const react = canonicalizeStyleValue(
		'animation',
		'_enter_7n8gw_1 80ms cubic-bezier(0.4, 0, 0.2, 1)'
	);
	const svelte = canonicalizeStyleValue(
		'animation',
		'c15t-ui-enter-oqaf_ 80ms cubic-bezier(0.4, 0, 0.2, 1)'
	);
	expect(react).toBe(svelte);
	expect(react).toBe('<anim> 80ms cubic-bezier(0.4, 0, 0.2, 1)');
});

test('canonicalizeStyleValue applies animation normalization to custom properties', () => {
	const react = canonicalizeStyleValue(
		'--consent-widget-entry-animation',
		'_enter_7n8gw_1 80ms cubic-bezier(0.4, 0, 0.2, 1)'
	);
	const svelte = canonicalizeStyleValue(
		'--consent-widget-entry-animation',
		'c15t-ui-enter-oqaf_ 80ms cubic-bezier(0.4, 0, 0.2, 1)'
	);
	expect(react).toBe(svelte);
});

test('canonicalizeStyleValue preserves animation keyword values', () => {
	expect(canonicalizeStyleValue('animation-name', 'none')).toBe('none');
	expect(canonicalizeStyleValue('animation', 'none')).toBe('none');
});

test('diffComputedStyle ignores hex vs hsl when equivalent', () => {
	const a = {
		properties: { color: '#5c5c5c' },
		customProperties: {},
	};
	const b = {
		properties: { color: 'hsl(0, 0%, 36.08%)' },
		customProperties: {},
	};
	expect(diffComputedStyle(a, b)).toEqual([]);
});

test('diffComputedStyle ignores animation-name hash drift across bundlers', () => {
	const a = {
		properties: {},
		customProperties: {
			'--consent-widget-entry-animation':
				'_enter_7n8gw_1 80ms cubic-bezier(0.4, 0, 0.2, 1)',
		},
	};
	const b = {
		properties: {},
		customProperties: {
			'--consent-widget-entry-animation':
				'c15t-ui-enter-oqaf_ 80ms cubic-bezier(0.4, 0, 0.2, 1)',
		},
	};
	expect(diffComputedStyle(a, b)).toEqual([]);
});
