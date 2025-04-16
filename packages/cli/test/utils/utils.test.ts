import { describe, expect, it } from 'vitest';
import { capitalizeFirstLetter } from '../../src/utils/capitalize-first-letter';

describe('utility functions', () => {
	describe('capitalizeFirstLetter', () => {
		it('should capitalize the first letter of a string', () => {
			expect(capitalizeFirstLetter('hello')).toBe('Hello');
			expect(capitalizeFirstLetter('world')).toBe('World');
			expect(capitalizeFirstLetter('test')).toBe('Test');
		});

		it('should handle empty strings', () => {
			expect(capitalizeFirstLetter('')).toBe('');
		});

		it('should handle already capitalized strings', () => {
			expect(capitalizeFirstLetter('Hello')).toBe('Hello');
			expect(capitalizeFirstLetter('Test')).toBe('Test');
		});

		it('should handle single character strings', () => {
			expect(capitalizeFirstLetter('a')).toBe('A');
			expect(capitalizeFirstLetter('z')).toBe('Z');
		});

		it('should only capitalize the first letter', () => {
			expect(capitalizeFirstLetter('helloWorld')).toBe('HelloWorld');
			expect(capitalizeFirstLetter('camelCase')).toBe('CamelCase');
		});
	});
});
