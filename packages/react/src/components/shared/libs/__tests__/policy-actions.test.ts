import { describe, expect, it } from 'vitest';
import {
	hasPolicyHints,
	resolvePolicyActionGroups,
	resolvePolicyActionOrder,
	resolvePolicyPrimaryAction,
	resolvePolicyUiProfile,
	shouldFillPolicyActions,
} from '../policy-actions';

describe('resolvePolicyActionOrder', () => {
	it('uses policy order and appends missing allowed actions', () => {
		const actions = resolvePolicyActionOrder({
			allowedActions: ['accept', 'reject'],
			actionOrder: ['reject'],
		});

		expect(actions).toEqual(['reject', 'accept']);
	});

	it('falls back to default actions when policy actions are absent', () => {
		const actions = resolvePolicyActionOrder({});
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
				actionOrder: [],
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
	it('returns a single group for inline layout', () => {
		const groups = resolvePolicyActionGroups({
			orderedActions: ['customize', 'accept', 'reject'],
			layout: 'inline',
		});

		expect(groups).toEqual([['customize', 'accept', 'reject']]);
	});

	it('returns split groups for default split layout', () => {
		const groups = resolvePolicyActionGroups({
			orderedActions: ['reject', 'accept', 'customize'],
			layout: 'split',
		});

		expect(groups).toEqual([['reject', 'accept'], ['customize']]);
	});

	it('isolates customize first when split layout starts with customize', () => {
		const groups = resolvePolicyActionGroups({
			orderedActions: ['customize', 'reject', 'accept'],
			layout: 'split',
		});

		expect(groups).toEqual([['customize'], ['reject', 'accept']]);
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
			})
		).toBe(true);
	});

	it('fills for balanced with single action group <= 2 actions', () => {
		expect(
			shouldFillPolicyActions({
				uiProfile: 'balanced',
				actionGroups: [['accept', 'reject']],
			})
		).toBe(true);
	});

	it('fills for balanced with 3 actions in split groups', () => {
		expect(
			shouldFillPolicyActions({
				uiProfile: 'balanced',
				actionGroups: [['customize'], ['accept', 'reject']],
			})
		).toBe(true);
	});

	it('does not fill for balanced with 3 actions inline', () => {
		expect(
			shouldFillPolicyActions({
				uiProfile: 'balanced',
				actionGroups: [['customize', 'accept', 'reject']],
			})
		).toBe(false);
	});

	it('does not fill for compact profile', () => {
		expect(
			shouldFillPolicyActions({
				uiProfile: 'compact',
				actionGroups: [['customize']],
			})
		).toBe(false);
	});
});
