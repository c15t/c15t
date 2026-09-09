import { custom } from '@c15t/core';
import type { PolicyRule } from '@c15t/schema/types';
import { resolvePolicyRules } from '@c15t/schema/types';
import { render, waitFor } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';

import type { ConsentContextValue } from '../lib/context.svelte';
import Fixture from './fixtures/surfaces-fixture.svelte';
import { policyFixture } from './policy-fixture';

/** A regime with no consent law: permitted by default, nothing owed. */
const noneRule: PolicyRule = {
	id: 'svelte_world_none',
	match: { fallback: true, isDefault: true },
	model: 'none',
	prompt: 'none',
};

const SURFACES = [
	'consent-banner-root',
	'consent-dialog-root',
	'consent-dialog-trigger',
	'consent-dialog-link',
	'consent-widget-root',
] as const;

const query = (testId: string) =>
	document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

/** Render every surface against a resolved `none` rule. */
const renderUnderNone = (rule: PolicyRule) => {
	let context: ConsentContextValue | undefined;
	render(Fixture, {
		capture(value: ConsentContextValue) {
			context = value;
		},
		options: {
			disableAnimation: true,
			mode: custom({
				init: () => Promise.resolve({}),
				recordPrivacyOptOut: () => Promise.resolve(),
				save: () => Promise.resolve({ ok: true, subjectId: 'svelte-test' }),
			}),
			persistence: false,
			prefetch: {
				...policyFixture(),
				initialPolicyResolution: resolvePolicyRules({
					countryCode: 'US',
					regionCode: 'SD',
					rules: [rule],
				}),
			},
		},
	});
	return () => {
		if (!context) {
			throw new Error('Expected the provider context');
		}
		return context;
	};
};

describe('consent surfaces under a none rule', () => {
	test('grant every category and render nothing when no rights are owed', async () => {
		const current = renderUnderNone(noneRule);
		const { snapshot, state } = current();
		expect(snapshot.resolution.status).toBe('matched');
		expect(snapshot.policyRule.model).toBe('none');
		expect(snapshot.promptRequirement.kind).toBe('none');
		expect(snapshot.effectivePermissions.measurement).toBe(true);
		expect(snapshot.effectivePermissions.marketing).toBe(true);
		expect(state.hasPolicy).toBe(true);
		expect(state.hasConsentUi).toBe(false);

		// Even an explicit request to open the preference center shows nothing.
		state.setActiveUI('dialog', { force: true });
		await Promise.resolve();

		for (const testId of SURFACES) {
			expect(query(testId), testId).toBeNull();
		}
	});

	test('keep preferences reachable when the rule grants that right', async () => {
		const current = renderUnderNone({ ...noneRule, rights: ['preferences'] });
		expect(current().state.hasConsentUi).toBe(true);

		// No prompt, so no banner; the trigger and link are the route in.
		expect(query('consent-banner-root')).toBeNull();
		await waitFor(() => {
			expect(query('consent-dialog-trigger')).not.toBeNull();
			expect(query('consent-dialog-link')).not.toBeNull();
		});

		current().state.setActiveUI('dialog');
		await waitFor(() => {
			expect(query('consent-dialog-root')).not.toBeNull();
		});

		// Saving under `none` records nothing; the dialog still closes.
		await current().state.saveConsents('all');
		await waitFor(() => {
			expect(query('consent-dialog-root')).toBeNull();
		});
		expect(current().snapshot.explicitChoice).toBeNull();
	});
});
