/**
 * The `none` model: a regime that grants the visitor no rights over the
 * optional categories. Processing is permitted by default, nothing prompts,
 * nothing is recorded, and no consent UI is owed.
 */
import { describe, expect, test } from 'vitest';

import {
	matchedResolution,
	noneRule,
	NOW,
} from '../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../index';

describe('the none model', () => {
	test('grants every in-scope category with no prompt and no first layer', () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(noneRule()),
			now: NOW,
		});
		const snapshot = kernel.getSnapshot();
		expect(snapshot.model).toBe('none');
		expect(snapshot.policyRule.rights).toEqual([]);
		expect(snapshot.effectivePermissions).toEqual({
			experience: true,
			functionality: true,
			marketing: true,
			measurement: true,
			necessary: true,
		});
		expect(snapshot.promptRequirement).toEqual({ kind: 'none' });
		expect(snapshot.activeUI).toBe('none');
		expect(snapshot.explicitChoice).toBeNull();
	});

	test('strict scope still denies categories outside the rule', () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(
				noneRule({ categories: ['measurement'], scopeMode: 'strict' })
			),
			now: NOW,
		});
		expect(kernel.getSnapshot().effectivePermissions).toMatchObject({
			marketing: false,
			measurement: true,
		});
	});

	test('honors GPC only when the rule maps it', () => {
		const unmapped = createConsentKernel({
			initialOverrides: { gpc: true },
			initialPolicyResolution: matchedResolution(noneRule()),
			now: NOW,
		});
		expect(unmapped.getSnapshot().effectivePermissions.marketing).toBe(true);
		const mapped = createConsentKernel({
			initialOverrides: { gpc: true },
			initialPolicyResolution: matchedResolution(
				noneRule({
					privacySignals: { gpc: { denyCategories: ['marketing'] } },
				})
			),
			now: NOW,
		});
		expect(mapped.getSnapshot().effectivePermissions).toMatchObject({
			marketing: false,
			measurement: true,
		});
	});

	test('save records nothing, writes nothing and announces nothing', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(noneRule()),
			now: NOW,
		});
		const events: string[] = [];
		kernel.events.on('choice:recorded', () => events.push('choice'));
		const result = await kernel.commands.save('all');
		expect(result).toEqual({ confirmed: [], ok: true, subjectId: undefined });
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		expect(kernel.getSnapshot().subject).toBeNull();
		expect(events).toEqual([]);
		const denied = await kernel.commands.save({ marketing: false });
		expect(denied.ok).toBe(true);
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
	});
});
