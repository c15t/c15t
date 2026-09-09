import type { InitResponse } from '@c15t/core';
import { custom } from '@c15t/core';
import type { PolicyRule } from '@c15t/schema/types';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { render, waitFor } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';

import type { ConsentContextValue } from '../lib/context.svelte';
import Fixture from './fixtures/surfaces-fixture.svelte';
import { policyFixture } from './policy-fixture';

const choiceRule: PolicyRule = {
	id: 'svelte_late_policy',
	match: { fallback: true },
	model: 'opt-in',
	prompt: 'choice',
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

/**
 * Render every surface against a kernel whose resolution failed and whose
 * transport answers the next init with whatever `response` holds.
 */
const renderWithoutPolicy = () => {
	let response: InitResponse = {};
	let context: ConsentContextValue | undefined;
	render(Fixture, {
		capture(value: ConsentContextValue) {
			context = value;
		},
		options: {
			disableAnimation: true,
			mode: custom({
				init: () => Promise.resolve(response),
				recordPrivacyOptOut: () => Promise.resolve(),
				save: () => Promise.resolve({ ok: true, subjectId: 'svelte-test' }),
			}),
			persistence: false,
			prefetch: {
				...policyFixture(),
				initialPolicyResolution: {
					policy: null,
					reason: 'transport',
					status: 'failed',
				},
			},
		},
	});
	const current = () => {
		if (!context) {
			throw new Error('Expected the provider context');
		}
		return context;
	};
	return {
		current,
		async resolvePolicy(rule: PolicyRule) {
			response = {
				policyResolution: writePolicyResolutionWire(
					resolvePolicyRules({
						countryCode: null,
						regionCode: null,
						rules: [rule],
					})
				),
			};
			await current().kernel.commands.init();
		},
	};
};

describe('consent surfaces without a resolved policy', () => {
	test('render nothing while the resolution is not matched', async () => {
		const { current } = renderWithoutPolicy();
		expect(current().snapshot.resolution.status).toBe('failed');
		expect(current().state.hasPolicy).toBe(false);

		// Even an explicit request to open the preference center shows nothing.
		current().state.setActiveUI('dialog', { force: true });
		await Promise.resolve();

		for (const testId of SURFACES) {
			expect(query(testId), testId).toBeNull();
		}
	});

	test('appear on their own once a later init supplies a rule', async () => {
		const { current, resolvePolicy } = renderWithoutPolicy();
		for (const testId of SURFACES) {
			expect(query(testId), testId).toBeNull();
		}

		await resolvePolicy(choiceRule);
		expect(current().snapshot.resolution.status).toBe('matched');
		expect(current().state.hasPolicy).toBe(true);

		await waitFor(() => {
			expect(query('consent-banner-root')).not.toBeNull();
			expect(query('consent-dialog-trigger')).not.toBeNull();
			expect(query('consent-dialog-link')).not.toBeNull();
			expect(query('consent-widget-root')).not.toBeNull();
		});
	});
});
