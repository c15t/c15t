import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AllConsentNames, ConsentState } from '../../types';
import { type HasCondition, has } from '../has';

describe('has - Consent Condition Evaluation', () => {
	let mockConsents: ConsentState;
	let allTrueConsents: ConsentState;
	let allFalseConsents: ConsentState;

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();

		// Default consent state for most tests
		mockConsents = {
			necessary: true,
			measurement: true,
			marketing: false,
			functionality: false,
			experience: true,
		};

		// All consents granted
		allTrueConsents = {
			necessary: true,
			measurement: true,
			marketing: true,
			functionality: true,
			experience: true,
		};

		// All consents denied (except necessary which is typically required)
		allFalseConsents = {
			necessary: true,
			measurement: false,
			marketing: false,
			functionality: false,
			experience: false,
		};
	});

	describe('Simple Category Conditions', () => {
		it('should return true for granted consent', () => {
			expect(has('necessary', mockConsents)).toBe(true);
			expect(has('measurement', mockConsents)).toBe(true);
			expect(has('experience', mockConsents)).toBe(true);
		});

		it('should return false for denied consent', () => {
			expect(has('marketing', mockConsents)).toBe(false);
			expect(has('functionality', mockConsents)).toBe(false);
		});

		it('should work with all consent types', () => {
			const categories: AllConsentNames[] = [
				'necessary',
				'measurement',
				'marketing',
				'functionality',
				'experience',
			];

			for (const category of categories) {
				const result = has(category, allTrueConsents);
				expect(result).toBe(true);
			}
		});

		it('should throw error for invalid consent category', () => {
			expect(() => {
				// @ts-expect-error Testing invalid category
				has('invalid-category', mockConsents);
			}).toThrow(
				'Consent category "invalid-category" not found in consent state'
			);
		});
	});

	describe('AND Conditions', () => {
		it('should handle single AND condition', () => {
			const condition: HasCondition<AllConsentNames> = { and: 'necessary' };
			expect(has(condition, mockConsents)).toBe(true);

			const falseCondition: HasCondition<AllConsentNames> = {
				and: 'marketing',
			};
			expect(has(falseCondition, mockConsents)).toBe(false);
		});

		it('should handle AND array with all true conditions', () => {
			const condition: HasCondition<AllConsentNames> = {
				and: ['necessary', 'measurement', 'experience'],
			};
			expect(has(condition, mockConsents)).toBe(true);
		});

		it('should handle AND array with some false conditions', () => {
			const condition: HasCondition<AllConsentNames> = {
				and: ['necessary', 'measurement', 'marketing'],
			};
			expect(has(condition, mockConsents)).toBe(false);
		});

		it('should handle AND with all false conditions', () => {
			const condition: HasCondition<AllConsentNames> = {
				and: ['marketing', 'functionality'],
			};
			expect(has(condition, mockConsents)).toBe(false);
		});

		it('should throw error for empty AND condition', () => {
			const condition: HasCondition<AllConsentNames> = { and: [] };
			expect(() => has(condition, mockConsents)).toThrow(
				'AND condition cannot be empty'
			);
		});
	});

	describe('OR Conditions', () => {
		it('should handle single OR condition', () => {
			const trueCondition: HasCondition<AllConsentNames> = { or: 'necessary' };
			expect(has(trueCondition, mockConsents)).toBe(true);

			const falseCondition: HasCondition<AllConsentNames> = { or: 'marketing' };
			expect(has(falseCondition, mockConsents)).toBe(false);
		});

		it('should handle OR array with all true conditions', () => {
			const condition: HasCondition<AllConsentNames> = {
				or: ['necessary', 'measurement', 'experience'],
			};
			expect(has(condition, mockConsents)).toBe(true);
		});

		it('should handle OR array with some true conditions', () => {
			const condition: HasCondition<AllConsentNames> = {
				or: ['marketing', 'measurement', 'functionality'],
			};
			expect(has(condition, mockConsents)).toBe(true);
		});

		it('should handle OR array with all false conditions', () => {
			const condition: HasCondition<AllConsentNames> = {
				or: ['marketing', 'functionality'],
			};
			expect(has(condition, mockConsents)).toBe(false);
		});

		it('should throw error for empty OR condition', () => {
			const condition: HasCondition<AllConsentNames> = { or: [] };
			expect(() => has(condition, mockConsents)).toThrow(
				'OR condition cannot be empty'
			);
		});
	});

	describe('NOT Conditions', () => {
		it('should handle NOT with simple category', () => {
			const condition: HasCondition<AllConsentNames> = { not: 'marketing' };
			expect(has(condition, mockConsents)).toBe(true);

			const falseCondition: HasCondition<AllConsentNames> = {
				not: 'necessary',
			};
			expect(has(falseCondition, mockConsents)).toBe(false);
		});

		it('should handle NOT with AND condition', () => {
			const condition: HasCondition<AllConsentNames> = {
				not: { and: ['marketing', 'functionality'] },
			};
			expect(has(condition, mockConsents)).toBe(true);

			const falseCondition: HasCondition<AllConsentNames> = {
				not: { and: ['necessary', 'measurement'] },
			};
			expect(has(falseCondition, mockConsents)).toBe(false);
		});

		it('should handle NOT with OR condition', () => {
			const condition: HasCondition<AllConsentNames> = {
				not: { or: ['marketing', 'functionality'] },
			};
			expect(has(condition, mockConsents)).toBe(true);

			const falseCondition: HasCondition<AllConsentNames> = {
				not: { or: ['necessary', 'measurement'] },
			};
			expect(has(falseCondition, mockConsents)).toBe(false);
		});

		it('should handle nested NOT conditions', () => {
			const condition: HasCondition<AllConsentNames> = {
				not: { not: 'necessary' },
			};
			expect(has(condition, mockConsents)).toBe(true);

			const falseCondition: HasCondition<AllConsentNames> = {
				not: { not: 'marketing' },
			};
			expect(has(falseCondition, mockConsents)).toBe(false);
		});
	});

	describe('Complex Nested Conditions', () => {
		it('should handle AND with OR conditions', () => {
			const condition: HasCondition<AllConsentNames> = {
				and: [
					'necessary',
					{ or: ['measurement', 'marketing'] },
					{ or: ['experience', 'functionality'] },
				],
			};
			expect(has(condition, mockConsents)).toBe(true);
		});

		it('should handle OR with AND conditions', () => {
			const condition: HasCondition<AllConsentNames> = {
				or: [
					{ and: ['marketing', 'functionality'] }, // false
					{ and: ['necessary', 'measurement'] }, // true
				],
			};
			expect(has(condition, mockConsents)).toBe(true);
		});

		it('should handle deeply nested conditions', () => {
			const condition: HasCondition<AllConsentNames> = {
				and: [
					'necessary',
					{
						or: [
							{ and: ['marketing', 'functionality'] }, // false
							{ not: { and: ['marketing', 'functionality'] } }, // true
						],
					},
					{ not: 'functionality' }, // true
				],
			};
			expect(has(condition, mockConsents)).toBe(true);
		});

		it('should handle complex real-world scenario', () => {
			// Require necessary cookies AND (analytics OR marketing) AND NOT functionality
			const condition: HasCondition<AllConsentNames> = {
				and: [
					'necessary',
					{ or: ['measurement', 'marketing'] },
					{ not: 'functionality' },
				],
			};
			expect(has(condition, mockConsents)).toBe(true);

			// Change to a failing scenario
			const failingCondition: HasCondition<AllConsentNames> = {
				and: [
					'necessary',
					{ or: ['marketing', 'functionality'] }, // both false
					{ not: 'measurement' }, // measurement is true, so NOT measurement is false
				],
			};
			expect(has(failingCondition, mockConsents)).toBe(false);
		});
	});

	describe('Error Handling', () => {
		it('should throw error for invalid condition structure', () => {
			expect(() => {
				// @ts-expect-error Testing invalid structure
				has({ invalid: 'structure' }, mockConsents);
			}).toThrow('Invalid condition structure');
		});

		it('should throw error for null condition', () => {
			expect(() => {
				// @ts-expect-error Testing null condition
				has(null, mockConsents);
			}).toThrow('Invalid condition structure');
		});

		it('should handle undefined consent categories gracefully', () => {
			const incompleteConsents = {
				necessary: true,
				measurement: true,
			} as ConsentState;

			expect(() => {
				has('marketing', incompleteConsents);
			}).toThrow('Consent category "marketing" not found in consent state');
		});
	});

	describe('Edge Cases', () => {
		it('should handle boolean false values correctly', () => {
			const consents: ConsentState = {
				necessary: true,
				measurement: false,
				marketing: false,
				functionality: false,
				experience: false,
			};

			expect(has('measurement', consents)).toBe(false);
			expect(has({ not: 'measurement' }, consents)).toBe(true);
		});

		it('should handle single-item arrays', () => {
			const condition: HasCondition<AllConsentNames> = {
				and: ['necessary'],
			};
			expect(has(condition, mockConsents)).toBe(true);

			const orCondition: HasCondition<AllConsentNames> = {
				or: ['marketing'],
			};
			expect(has(orCondition, mockConsents)).toBe(false);
		});

		it('should work with all categories set to false', () => {
			const condition: HasCondition<AllConsentNames> = {
				or: ['marketing', 'functionality', 'experience'],
			};
			expect(has(condition, allFalseConsents)).toBe(false);

			const notCondition: HasCondition<AllConsentNames> = {
				not: { or: ['marketing', 'functionality'] },
			};
			expect(has(notCondition, allFalseConsents)).toBe(true);
		});
	});

	describe('Type Safety', () => {
		it('should work with proper TypeScript types', () => {
			// These should compile without TypeScript errors
			const stringCondition: HasCondition<AllConsentNames> = 'necessary';
			const andCondition: HasCondition<AllConsentNames> = {
				and: ['necessary', 'measurement'],
			};
			const orCondition: HasCondition<AllConsentNames> = {
				or: ['marketing', 'functionality'],
			};
			const notCondition: HasCondition<AllConsentNames> = {
				not: 'experience',
			};
			const complexCondition: HasCondition<AllConsentNames> = {
				and: [
					'necessary',
					{ or: ['measurement', 'marketing'] },
					{ not: { and: ['functionality', 'experience'] } },
				],
			};

			// All should execute without errors
			expect(() => has(stringCondition, mockConsents)).not.toThrow();
			expect(() => has(andCondition, mockConsents)).not.toThrow();
			expect(() => has(orCondition, mockConsents)).not.toThrow();
			expect(() => has(notCondition, mockConsents)).not.toThrow();
			expect(() => has(complexCondition, mockConsents)).not.toThrow();
		});
	});

	describe('Performance and Scalability', () => {
		it('should handle deeply nested conditions efficiently', () => {
			// Create a deep nesting structure
			let condition: HasCondition<AllConsentNames> = 'necessary';
			for (let i = 0; i < 10; i++) {
				condition = { not: condition };
			}

			// Should complete without stack overflow
			const start = performance.now();
			const result = has(condition, mockConsents);
			const end = performance.now();

			expect(result).toBe(true); // Double negation should result in true
			expect(end - start).toBeLessThan(100); // Should be fast
		});

		it('should handle large AND/OR arrays efficiently', () => {
			const largeAndCondition: HasCondition<AllConsentNames> = {
				and: new Array(100).fill('necessary'),
			};

			const start = performance.now();
			const result = has(largeAndCondition, mockConsents);
			const end = performance.now();

			expect(result).toBe(true);
			expect(end - start).toBeLessThan(100);
		});
	});
});
