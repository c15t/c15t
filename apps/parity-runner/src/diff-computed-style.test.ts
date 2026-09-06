import { expect, test } from 'bun:test';

import {
	normalizeComputedStyleMap,
	normalizeCssValue,
} from './diff-computed-style';

test('normalizeCssValue restores a missing leading zero', () => {
	expect(normalizeCssValue('.5rem')).toBe('0.5rem');
	expect(normalizeCssValue('cubic-bezier(.4, 0, .2, 1)')).toBe(
		'cubic-bezier(0.4, 0, 0.2, 1)'
	);
	expect(normalizeCssValue('rgba(0, 0, 0, .08)')).toBe('rgba(0, 0, 0, 0.08)');
});

test('normalizeCssValue converts seconds to milliseconds', () => {
	expect(normalizeCssValue('.15s')).toBe('150ms');
	expect(normalizeCssValue('2s')).toBe('2000ms');
	expect(normalizeCssValue('0.08s')).toBe('80ms');
});

test('normalizeCssValue leaves milliseconds alone', () => {
	expect(normalizeCssValue('150ms')).toBe('150ms');
	expect(normalizeCssValue('80ms cubic-bezier(0.4, 0, 0.2, 1)')).toBe(
		'80ms cubic-bezier(0.4, 0, 0.2, 1)'
	);
});

test('normalizeCssValue strips the CSS Modules hash from a scoped name', () => {
	expect(normalizeCssValue('_enter_t5rx4_1')).toBe('enter');
	expect(
		normalizeCssValue('_enter_t5rx4_1 80ms cubic-bezier(.4, 0, .2, 1)')
	).toBe('enter 80ms cubic-bezier(0.4, 0, 0.2, 1)');
});

test('normalizeCssValue folds the two spellings onto one another', () => {
	const minified = normalizeCssValue(
		'enter 80ms cubic-bezier(.4, 0, .2, 1), fade .15s linear'
	);
	const authored = normalizeCssValue(
		[
			'_enter_t5rx4_1 80ms cubic-bezier(0.4, 0, 0.2, 1),',
			'_fade_t5rx4_2 150ms linear',
		].join(' ')
	);
	expect(minified).toBe(authored);
});

test('normalizeCssValue drops trailing zeros', () => {
	expect(normalizeCssValue('1.50px')).toBe('1.5px');
	expect(normalizeCssValue('2.0rem')).toBe('2rem');
	expect(normalizeCssValue('10px')).toBe('10px');
});

test('normalizeCssValue leaves values it does not recognise alone', () => {
	expect(normalizeCssValue('rgb(255, 255, 255)')).toBe('rgb(255, 255, 255)');
	expect(normalizeCssValue('"Inter", system-ui, sans-serif')).toBe(
		'"Inter", system-ui, sans-serif'
	);
	expect(normalizeCssValue('translate3d(0, 0, 0)')).toBe(
		'translate3d(0, 0, 0)'
	);
	expect(normalizeCssValue('none')).toBe('none');
});

test('normalizeComputedStyleMap normalizes values, not keys', () => {
	const normalized = normalizeComputedStyleMap({
		'consent-banner-card': {
			customProperties: { '--accordion-radius': '.5rem' },
			properties: { 'border-radius': '.5rem', display: 'flex' },
		},
	});

	expect(normalized).toEqual({
		'consent-banner-card': {
			customProperties: { '--accordion-radius': '0.5rem' },
			properties: { 'border-radius': '0.5rem', display: 'flex' },
		},
	});
});

test('normalizeCssValue leaves url() payloads alone', () => {
	// `2s.svg` is a file name, not a duration: folding it would make this
	// compare equal to a genuinely different `url(/assets/2000ms.svg)`.
	expect(normalizeCssValue('url(/assets/2s.svg)')).toBe('url(/assets/2s.svg)');
	expect(normalizeCssValue('url("/assets/.5x_a1b2c3_1.png")')).toBe(
		'url("/assets/.5x_a1b2c3_1.png")'
	);
	expect(normalizeCssValue("url('/a/1.50s.woff2')")).toBe(
		"url('/a/1.50s.woff2')"
	);
});

test('normalizeCssValue leaves quoted strings alone', () => {
	expect(normalizeCssValue('"2s.svg"')).toBe('"2s.svg"');
	expect(normalizeCssValue("content: '.5 _x_a1b2c3_1'")).toBe(
		"content: '.5 _x_a1b2c3_1'"
	);
});

test('normalizeCssValue still folds the text around an opaque segment', () => {
	expect(normalizeCssValue('url(/a/2s.svg) .15s _enter_t5rx4_1')).toBe(
		'url(/a/2s.svg) 150ms enter'
	);
});

test('normalizeCssValue does not read a path segment as a duration', () => {
	expect(normalizeCssValue('2s/cover')).toBe('2s/cover');
});
