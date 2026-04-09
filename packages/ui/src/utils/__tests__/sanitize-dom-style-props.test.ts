import { describe, expect, test } from 'vitest';
import { sanitizeDOMStyleProps } from '../sanitize-dom-style-props';

describe('sanitizeDOMStyleProps', () => {
	test('removes internal metadata while preserving className and style', () => {
		const result = sanitizeDOMStyleProps({
			className: 'custom-class',
			style: { backgroundColor: 'red' },
			noStyle: true,
		});

		expect(result).toEqual({
			className: 'custom-class',
			style: { backgroundColor: 'red' },
		});
		expect('noStyle' in result).toBe(false);
	});

	test('does not mutate the original style object', () => {
		const style = {
			className: 'custom-class',
			style: { color: 'blue' },
			noStyle: true,
		};

		sanitizeDOMStyleProps(style);

		expect(style).toEqual({
			className: 'custom-class',
			style: { color: 'blue' },
			noStyle: true,
		});
	});

	test('handles undefined input', () => {
		expect(sanitizeDOMStyleProps()).toEqual({
			className: undefined,
			style: undefined,
		});
	});
});
