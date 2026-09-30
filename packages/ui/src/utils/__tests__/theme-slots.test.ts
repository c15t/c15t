import { describe, expect, test } from 'vitest';

import { applyThemeSlots } from '../theme-slots';

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
