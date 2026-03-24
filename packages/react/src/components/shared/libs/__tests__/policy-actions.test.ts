import { describe, expect, it } from 'vitest';
import {
	hasPolicyHints,
	resolvePolicyActionGroups,
	resolvePolicyAllowedActions,
	resolvePolicyDirection,
	resolvePolicyOrderedActions,
	resolvePolicyPrimaryAction,
	resolvePolicyUiProfile,
	shouldFillPolicyActions,
} from '../policy-actions';

describe('resolvePolicyAllowedActions', () => {
	it('uses configured allowed actions', () => {
		const actions = resolvePolicyAllowedActions({
			allowedActions: ['accept', 'reject'],
		});

		expect(actions).toEqual(['accept', 'reject']);
	});

	it('falls back to default actions when policy actions are absent', () => {
		const actions = resolvePolicyAllowedActions({});
		expect(actions).toEqual(['reject', 'accept', 'customize']);
	});
});

describe('resolvePolicyOrderedActions', () => {
	it('uses grouped layout ordering', () => {
		const actions = resolvePolicyOrderedActions({
			allowedActions: ['accept', 'reject', 'customize'],
			layout: [['reject', 'accept'], 'customize'],
		});

		expect(actions).toEqual(['reject', 'accept', 'customize']);
	});
});

describe('resolvePolicyPrimaryAction', () => {
	it('returns undefined when no policy primary action is set', () => {
		const primary = resolvePolicyPrimaryAction({
			orderedActions: ['accept', 'reject'],
		});

		expect(primary).toBeUndefined();
	});

	it('returns fallback when policy primary is not part of ordered actions', () => {
		const primary = resolvePolicyPrimaryAction({
			orderedActions: ['accept', 'reject'],
			primaryAction: 'customize',
		});

		expect(primary).toBe('accept');
	});
});

describe('hasPolicyHints', () => {
	it('returns false for empty arrays and absent booleans', () => {
		expect(
			hasPolicyHints({
				allowedActions: [],
				layout: [],
			})
		).toBe(false);
	});

	it('returns true for explicit boolean hints', () => {
		expect(
			hasPolicyHints({
				scrollLock: false,
			})
		).toBe(true);
	});
});

describe('resolvePolicyActionGroups', () => {
	it('returns a single group when layout is omitted', () => {
		const groups = resolvePolicyActionGroups({
			allowedActions: ['customize', 'accept', 'reject'],
		});

		expect(groups).toEqual([['customize', 'accept', 'reject']]);
	});

	it('returns grouped row layout', () => {
		const groups = resolvePolicyActionGroups({
			allowedActions: ['reject', 'accept', 'customize'],
			layout: [['reject', 'accept'], 'customize'],
		});

		expect(groups).toEqual([['reject', 'accept'], ['customize']]);
	});

	it('supports split stack layouts', () => {
		const groups = resolvePolicyActionGroups({
			allowedActions: ['customize', 'reject', 'accept'],
			layout: ['customize', ['reject', 'accept']],
		});

		expect(groups).toEqual([['customize'], ['reject', 'accept']]);
	});
});

describe('resolvePolicyDirection', () => {
	it('defaults to row', () => {
		expect(resolvePolicyDirection(undefined)).toBe('row');
	});

	it('returns column unchanged', () => {
		expect(resolvePolicyDirection('column')).toBe('column');
	});
});

describe('resolvePolicyUiProfile', () => {
	it('falls back to compact profile when undefined', () => {
		expect(resolvePolicyUiProfile(undefined)).toBe('compact');
	});

	it('returns a valid profile unchanged', () => {
		expect(resolvePolicyUiProfile('balanced')).toBe('balanced');
		expect(resolvePolicyUiProfile('strict')).toBe('strict');
	});
});

describe('shouldFillPolicyActions', () => {
	it('fills for strict profile', () => {
		expect(
			shouldFillPolicyActions({
				uiProfile: 'strict',
				actionGroups: [['customize']],
				direction: 'row',
			})
		).toBe(true);
	});

	it('fills for balanced with single action group <= 2 actions', () => {
		expect(
			shouldFillPolicyActions({
				uiProfile: 'balanced',
				actionGroups: [['accept', 'reject']],
				direction: 'row',
			})
		).toBe(true);
	});

	it('fills for balanced with 3 actions in split groups', () => {
		expect(
			shouldFillPolicyActions({
				uiProfile: 'balanced',
				actionGroups: [['customize'], ['accept', 'reject']],
				direction: 'row',
			})
		).toBe(true);
	});

	it('fills for balanced with 3 actions in a column layout', () => {
		expect(
			shouldFillPolicyActions({
				uiProfile: 'balanced',
				actionGroups: [['customize', 'accept', 'reject']],
				direction: 'column',
			})
		).toBe(true);
	});

	it('does not fill for balanced with 3 actions in one row group', () => {
		expect(
			shouldFillPolicyActions({
				uiProfile: 'balanced',
				actionGroups: [['customize', 'accept', 'reject']],
				direction: 'row',
			})
		).toBe(false);
	});

	it('does not fill for compact profile', () => {
		expect(
			shouldFillPolicyActions({
				uiProfile: 'compact',
				actionGroups: [['customize']],
				direction: 'row',
			})
		).toBe(false);
	});
});
