/**
 * Vue's wrapper around `@c15t/core/preference-draft`. The draft rules are
 * pinned by the core suite; these tests cover what Vue adds: `values` as a
 * ref a `v-model` writes into and refs that follow the kernel.
 *
 * @vitest-environment jsdom
 */
import type { AllConsentNames } from '@c15t/core';
import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
} from '@c15t/schema/types';
import type { PolicyResolution } from '@c15t/schema/types';
import { afterEach, expect, test } from 'vitest';
import { createApp, defineComponent, h, nextTick } from 'vue';

import { consentConfigKey } from '../runtime/composables/config';
import { useConsentDraft } from '../runtime/composables/draft';
import { createVueConsentKernelContext } from '../runtime/kernel';
import { symbolKernelContext } from '../runtime/utils/symbols';

const policy = normalizePolicyRule({
	categories: ['measurement', 'marketing'],
	id: 'vue-draft',
	match: { isDefault: true },
	model: 'opt-in',
	prompt: 'choice',
	scopeMode: 'strict',
});
const resolution: PolicyResolution = {
	fingerprints: createPolicyRuleFingerprints(policy),
	matchedBy: 'default',
	policy,
	policyId: policy.id,
	status: 'matched',
};
const DECLARED: AllConsentNames[] = ['marketing', 'measurement'];

const cleanups: (() => void)[] = [];
afterEach(() => {
	for (const cleanup of cleanups.splice(0)) {
		cleanup();
	}
});

const mountDraft = function mountDraft() {
	const context = createVueConsentKernelContext({
		config: { consentCategories: DECLARED },
		kernelConfig: { initialPolicyResolution: resolution },
	});
	let draft!: ReturnType<typeof useConsentDraft>;
	const app = createApp(
		defineComponent({
			setup() {
				draft = useConsentDraft();
				return () => h('div');
			},
		})
	);
	app.provide(symbolKernelContext, context);
	app.provide(consentConfigKey, { consentCategories: DECLARED });
	app.mount(document.createElement('div'));
	cleanups.push(() => {
		app.unmount();
		context.dispose();
	});
	return { context, draft };
};

test('a write into values stages through the draft, the way v-model does', async () => {
	const { context, draft } = mountDraft();
	draft.values.value.marketing = true;
	await nextTick();
	expect(draft.isDirty.value).toBe(true);
	expect(context.snapshot.value.effectivePermissions.marketing).toBe(false);
	// No backend here: the save records locally and its request fails.
	await draft.save();
	expect(
		context.snapshot.value.explicitChoice?.categories.marketing?.value
	).toBe(true);
	expect(draft.isDirty.value).toBe(false);
});

test('a write the draft refuses snaps back', async () => {
	const { draft } = mountDraft();
	draft.values.value.necessary = false;
	await nextTick();
	expect(draft.values.value.necessary).toBe(true);
	expect(draft.isDirty.value).toBe(false);
});

test('the refs follow a record another surface saved', async () => {
	const { context, draft } = mountDraft();
	draft.values.value.marketing = true;
	await context.kernel.commands.save({ measurement: true });
	expect(draft.values.value).toMatchObject({
		marketing: true,
		measurement: true,
	});
});

test('displayedCategories lists the scope in the display order, not the policy order', () => {
	// The policy scope sorts alphabetically (marketing, measurement); the
	// surfaces list categories in the one display order every adapter uses.
	const { context, draft } = mountDraft();
	expect(draft.displayedCategories.value).toEqual([
		'necessary',
		'measurement',
		'marketing',
	]);
	expect(draft.displayedCategories.value).toEqual(
		context.runtime.consentCategories
	);
});
