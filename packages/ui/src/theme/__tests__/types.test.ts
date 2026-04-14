import { describe, expect, test } from 'vitest';
import { defineTheme } from '../types';

describe('defineTheme', () => {
	test('returns the same theme object', () => {
		const theme = {
			colors: {
				primary: '#ff0000',
			},
		};
		const result = defineTheme(theme);
		expect(result).toBe(theme);
	});

	test('preserves all theme properties', () => {
		const theme = {
			colors: {
				primary: '#ff0000',
				surface: '#ffffff',
			},
			typography: {
				fontFamily: 'Arial',
			},
			spacing: {
				md: '1rem',
			},
			radius: {
				md: '8px',
			},
			shadows: {
				md: '0 4px 6px rgba(0,0,0,0.1)',
			},
			motion: {
				easing: 'ease-in-out',
			},
			slots: {
				banner: 'custom-banner-class',
			},
		};
		const result = defineTheme(theme);
		expect(result).toEqual(theme);
	});

	test('allows partial theme definition', () => {
		const partialTheme = {
			colors: {
				primary: 'blue',
			},
		};
		const result = defineTheme(partialTheme);
		expect(result.colors?.primary).toBe('blue');
		expect(result.typography).toBeUndefined();
	});

	test('allows empty theme', () => {
		const emptyTheme = {};
		const result = defineTheme(emptyTheme);
		expect(result).toEqual({});
	});

	test('preserves slot configurations', () => {
		const theme = {
			slots: {
				banner: {
					className: 'custom-class',
					style: { padding: '20px' },
				},
				dialogCard: 'simple-class',
			},
		};
		const result = defineTheme(theme);
		expect(result.slots?.banner).toEqual({
			className: 'custom-class',
			style: { padding: '20px' },
		});
		expect(result.slots?.dialogCard).toBe('simple-class');
	});

	test('preserves dark mode overrides', () => {
		const theme = {
			colors: {
				primary: '#0066ff',
				surface: '#ffffff',
			},
			dark: {
				primary: '#3388ff',
				surface: '#1a1a1a',
			},
		};
		const result = defineTheme(theme);
		expect(result.dark?.primary).toBe('#3388ff');
		expect(result.dark?.surface).toBe('#1a1a1a');
	});
});
