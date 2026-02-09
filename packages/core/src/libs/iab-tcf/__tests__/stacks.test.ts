/**
 * Tests for purpose stacking utilities.
 */

import { describe, expect, it } from 'vitest';
import {
	DEFAULT_STACKS,
	flattenPurposesByStack,
	getPurposesInStack,
	getStackForPurpose,
	groupPurposesIntoStacks,
	isStandalonePurpose,
	purposesToArray,
	STANDALONE_PURPOSE_ID,
} from '../stacks';
import { createMockPurposes, createMockStacks } from './test-setup';

describe('Purpose Stacking', () => {
	describe('STANDALONE_PURPOSE_ID', () => {
		it('should be 1 (Store/access info)', () => {
			expect(STANDALONE_PURPOSE_ID).toBe(1);
		});
	});

	describe('DEFAULT_STACKS', () => {
		it('should have 4 stacks', () => {
			expect(Object.keys(DEFAULT_STACKS)).toHaveLength(4);
		});

		it('should have Advertising stack (2, 3, 4)', () => {
			expect(DEFAULT_STACKS[1].purposes).toEqual([2, 3, 4]);
			expect(DEFAULT_STACKS[1].name).toBe('Advertising');
		});

		it('should have Content Personalization stack (5, 6, 11)', () => {
			expect(DEFAULT_STACKS[2].purposes).toEqual([5, 6, 11]);
			expect(DEFAULT_STACKS[2].name).toBe('Content Personalization');
		});

		it('should have Measurement stack (7, 8, 9)', () => {
			expect(DEFAULT_STACKS[3].purposes).toEqual([7, 8, 9]);
			expect(DEFAULT_STACKS[3].name).toBe('Measurement');
		});

		it('should have Product Development stack (10)', () => {
			expect(DEFAULT_STACKS[4].purposes).toEqual([10]);
			expect(DEFAULT_STACKS[4].name).toBe('Product Development');
		});
	});

	describe('groupPurposesIntoStacks', () => {
		it('should separate Purpose 1 as standalone', () => {
			const purposes = createMockPurposes();
			const { standalonePurposes } = groupPurposesIntoStacks(purposes);

			expect(standalonePurposes).toHaveLength(1);
			expect(standalonePurposes[0].id).toBe(1);
		});

		it('should group remaining purposes into stacks', () => {
			const purposes = createMockPurposes();
			const { stacks } = groupPurposesIntoStacks(purposes);

			expect(stacks.length).toBeGreaterThan(0);
		});

		it('should include resolved purposes in each stack', () => {
			const purposes = createMockPurposes();
			const { stacks } = groupPurposesIntoStacks(purposes);

			for (const stack of stacks) {
				expect(stack.resolvedPurposes).toBeDefined();
				expect(stack.resolvedPurposes.length).toBeGreaterThan(0);
			}
		});

		it('should work with array input', () => {
			const purposes = Object.values(createMockPurposes());
			const { standalonePurposes, stacks } = groupPurposesIntoStacks(purposes);

			expect(standalonePurposes).toHaveLength(1);
			expect(stacks.length).toBeGreaterThan(0);
		});

		it('should use custom stacks when provided', () => {
			const purposes = createMockPurposes();
			const customStacks = {
				99: {
					id: 99,
					name: 'Custom Stack',
					description: 'A custom stack',
					purposes: [2, 3],
					specialFeatures: [],
				},
			};

			const { stacks } = groupPurposesIntoStacks(purposes, customStacks);

			expect(stacks).toHaveLength(1);
			expect(stacks[0].id).toBe(99);
			expect(stacks[0].name).toBe('Custom Stack');
		});

		it('should handle empty purposes', () => {
			const { standalonePurposes, stacks, ungroupedPurposes } =
				groupPurposesIntoStacks([]);

			expect(standalonePurposes).toHaveLength(0);
			expect(stacks).toHaveLength(0);
			expect(ungroupedPurposes).toHaveLength(0);
		});

		it('should identify ungrouped purposes', () => {
			const purposes = [
				{ id: 1, name: 'Purpose 1', description: '', illustrations: [] },
				{ id: 99, name: 'Purpose 99', description: '', illustrations: [] }, // Not in any stack
			];

			const { ungroupedPurposes } = groupPurposesIntoStacks(purposes);

			expect(ungroupedPurposes).toHaveLength(1);
			expect(ungroupedPurposes[0].id).toBe(99);
		});
	});

	describe('getStackForPurpose', () => {
		it('should return null for Purpose 1 (standalone)', () => {
			expect(getStackForPurpose(1)).toBeNull();
		});

		it('should return the correct stack for a purpose', () => {
			const stack = getStackForPurpose(2); // Should be Advertising
			expect(stack).not.toBeNull();
			expect(stack?.name).toBe('Advertising');
		});

		it('should return null for unknown purposes', () => {
			expect(getStackForPurpose(99)).toBeNull();
		});

		it('should use custom stacks when provided', () => {
			const customStacks = {
				99: {
					id: 99,
					name: 'Custom',
					description: '',
					purposes: [2],
					specialFeatures: [],
				},
			};

			const stack = getStackForPurpose(2, customStacks);
			expect(stack?.name).toBe('Custom');
		});
	});

	describe('isStandalonePurpose', () => {
		it('should return true for Purpose 1', () => {
			expect(isStandalonePurpose(1)).toBe(true);
		});

		it('should return false for other purposes', () => {
			expect(isStandalonePurpose(2)).toBe(false);
			expect(isStandalonePurpose(7)).toBe(false);
			expect(isStandalonePurpose(11)).toBe(false);
		});
	});

	describe('getPurposesInStack', () => {
		it('should return purposes for a valid stack', () => {
			const purposes = createMockPurposes();
			const result = getPurposesInStack(1, purposes); // Advertising stack

			expect(result.length).toBeGreaterThan(0);
			expect(result.some((p) => p.id === 2)).toBe(true);
			expect(result.some((p) => p.id === 3)).toBe(true);
			expect(result.some((p) => p.id === 4)).toBe(true);
		});

		it('should not include Purpose 1 even if in stack definition', () => {
			const purposes = createMockPurposes();
			const customStacks = {
				1: {
					id: 1,
					name: 'Test',
					description: '',
					purposes: [1, 2, 3], // Includes Purpose 1
					specialFeatures: [],
				},
			};

			const result = getPurposesInStack(1, purposes, customStacks);

			expect(result.some((p) => p.id === 1)).toBe(false);
			expect(result.some((p) => p.id === 2)).toBe(true);
		});

		it('should return empty array for invalid stack', () => {
			const purposes = createMockPurposes();
			const result = getPurposesInStack(999, purposes);

			expect(result).toEqual([]);
		});
	});

	describe('flattenPurposesByStack', () => {
		it('should return purposes in correct order', () => {
			const purposes = createMockPurposes();
			const result = flattenPurposesByStack(purposes);

			// Purpose 1 should be first (standalone)
			expect(result[0].id).toBe(1);

			// Total should match input
			expect(result.length).toBe(Object.keys(purposes).length);
		});

		it('should include all purposes', () => {
			const purposes = createMockPurposes();
			const result = flattenPurposesByStack(purposes);

			const resultIds = result.map((p) => p.id).sort((a, b) => a - b);
			const inputIds = Object.values(purposes)
				.map((p) => p.id)
				.sort((a, b) => a - b);

			expect(resultIds).toEqual(inputIds);
		});
	});

	describe('purposesToArray', () => {
		it('should convert record to sorted array', () => {
			const purposes = createMockPurposes();
			const result = purposesToArray(purposes);

			expect(Array.isArray(result)).toBe(true);
			expect(result).toHaveLength(11);
			expect(result[0].id).toBe(1);
			expect(result[10].id).toBe(11);
		});

		it('should sort by ID', () => {
			const purposes = {
				5: createMockPurposes()[5],
				1: createMockPurposes()[1],
				11: createMockPurposes()[11],
			} as Record<number, ReturnType<typeof createMockPurposes>[1]>;

			const result = purposesToArray(purposes);

			expect(result[0].id).toBe(1);
			expect(result[1].id).toBe(5);
			expect(result[2].id).toBe(11);
		});
	});
});
