import { describe, expect, test } from 'vitest';

import {
	applyThemeSlots,
	toCSSDeclarations,
	toCSSPropertyName,
	toCSSValue,
	toStyleAttributeValue,
} from '../theme-slots';

describe('applyThemeSlots', () => {
	test('turns slot classes and styles into component attributes', () => {
		expect(
			applyThemeSlots(
				{
					consentBannerCard: 'rounded-none',
					consentDialogOverlay: { style: { opacity: '0.4' } },
				},
				undefined,
				'className'
			)
		).toEqual({
			banner: { card: { className: 'rounded-none' } },
			dialog: { overlay: { style: { opacity: '0.4' } } },
		});
	});

	test('keeps the app components on top of the theme slots', () => {
		expect(
			applyThemeSlots(
				{
					consentBannerCard: {
						className: 'theme-card',
						style: { color: 'red', padding: '1px' },
					},
				},
				{
					banner: {
						card: {
							class: 'app-card',
							'data-brand': 'on',
							style: { color: 'blue' },
						},
						title: { class: 'app-title' },
					},
				},
				'class'
			)
		).toEqual({
			banner: {
				card: {
					class: 'theme-card app-card',
					'data-brand': 'on',
					style: { color: 'blue', padding: '1px' },
				},
				title: { class: 'app-title' },
			},
		});
	});

	test('carries a slot noStyle onto the part, even with nothing else', () => {
		expect(
			applyThemeSlots(
				{
					consentBannerCard: { className: 'custom', noStyle: true },
					consentDialogCard: { noStyle: true },
				},
				undefined,
				'className'
			)
		).toEqual({
			banner: { card: { className: 'custom', noStyle: true } },
			dialog: { card: { noStyle: true } },
		});
	});

	test('keeps noStyle from either the theme slot or the components part', () => {
		expect(
			applyThemeSlots(
				{
					consentBannerCard: { className: 'theme-card', noStyle: true },
					consentBannerTitle: 'theme-title',
				},
				{
					banner: {
						card: { class: 'app-card', noStyle: false },
						title: { class: 'app-title', noStyle: true },
					},
				},
				'class'
			)
		).toEqual({
			banner: {
				card: { class: 'theme-card app-card', noStyle: true },
				title: { class: 'theme-title app-title', noStyle: true },
			},
		});
	});

	test('maps the consentGate slots onto the consent-gate parts', () => {
		expect(
			applyThemeSlots(
				{
					consentGate: 'gate-card',
					consentGateButton: 'gate-button',
					consentGateTitle: 'gate-title',
				},
				undefined,
				'class'
			)
		).toEqual({
			'consent-gate': {
				button: { class: 'gate-button' },
				root: { class: 'gate-card' },
				title: { class: 'gate-title' },
			},
		});
	});

	test('returns the components unchanged without slots', () => {
		const components = { banner: { card: { className: 'app-card' } } };
		expect(applyThemeSlots(undefined, components, 'className')).toBe(
			components
		);
		expect(applyThemeSlots({}, components, 'className')).toBe(components);
	});
});

describe('toCSSPropertyName', () => {
	test('turns camelCase keys into CSS property names', () => {
		expect(toCSSPropertyName('backgroundColor')).toBe('background-color');
		expect(toCSSPropertyName('WebkitMask')).toBe('-webkit-mask');
		expect(toCSSPropertyName('msTransform')).toBe('-ms-transform');
	});

	test('keeps custom properties and kebab-case keys as written', () => {
		expect(toCSSPropertyName('--brandAccent')).toBe('--brandAccent');
		expect(toCSSPropertyName('border-top-width')).toBe('border-top-width');
	});
});

describe('toCSSValue', () => {
	test('adds px to numbers for unitful properties', () => {
		expect(toCSSValue('padding', 8)).toBe('8px');
		expect(toCSSValue('fontSize', 14)).toBe('14px');
		expect(toCSSValue('border-top-width', 2)).toBe('2px');
		expect(toCSSValue('marginTop', -4)).toBe('-4px');
	});

	test('leaves numbers alone for unitless properties', () => {
		expect(toCSSValue('opacity', 0.5)).toBe('0.5');
		expect(toCSSValue('zIndex', 10)).toBe('10');
		expect(toCSSValue('flexGrow', 1)).toBe('1');
		expect(toCSSValue('line-height', 1.5)).toBe('1.5');
		expect(toCSSValue('fontWeight', 600)).toBe('600');
		expect(toCSSValue('WebkitLineClamp', 3)).toBe('3');
	});

	test('leaves zero, strings and custom properties alone', () => {
		expect(toCSSValue('padding', 0)).toBe('0');
		expect(toCSSValue('padding', '1rem')).toBe('1rem');
		expect(toCSSValue('--gap', 8)).toBe('8');
	});
});

describe('toCSSDeclarations', () => {
	test('drops empty values', () => {
		expect(
			toCSSDeclarations({ color: undefined, margin: '', padding: 8 })
		).toEqual([['padding', '8px']]);
		expect(toCSSDeclarations(undefined)).toEqual([]);
	});
});

describe('toStyleAttributeValue', () => {
	test('serializes a style object for a style attribute', () => {
		expect(
			toStyleAttributeValue({ '--brand': '#0a66ff', opacity: 0.5, padding: 8 })
		).toBe('--brand:#0a66ff;opacity:0.5;padding:8px');
	});

	test('returns undefined when nothing is set', () => {
		expect(toStyleAttributeValue({ color: undefined })).toBeUndefined();
		expect(toStyleAttributeValue(undefined)).toBeUndefined();
	});
});
