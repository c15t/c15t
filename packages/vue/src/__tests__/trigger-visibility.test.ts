import type { ConsentDialogTriggerVisibility } from '@c15t/schema/config';
import type { PolicyRule } from '@c15t/schema/types';
import { resolvePolicyRules } from '@c15t/schema/types';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, test } from 'vitest';
import type { ComponentPublicInstance } from 'vue';

import ConsentDialogTrigger from '../runtime/components/panel-trigger.vue';
import { consentConfigKey } from '../runtime/composables/config';
import type { ConsentConfig } from '../runtime/config';
import { createVueConsentKernelContext } from '../runtime/kernel';
import type { VueConsentKernelContext } from '../runtime/kernel';
import {
	symbolActiveUI,
	symbolConsent,
	symbolInit,
	symbolKernel,
	symbolKernelContext,
	symbolSnapshot,
} from '../runtime/utils/symbols';

const choiceRule: PolicyRule = {
	id: 'vue_trigger_choice',
	match: { fallback: true, isDefault: true },
	model: 'opt-in',
	prompt: 'choice',
};

let mounted: {
	context: VueConsentKernelContext;
	wrapper: VueWrapper<ComponentPublicInstance>;
} | null = null;

const trigger = () =>
	document.querySelector('[data-testid="consent-dialog-trigger"]');

/** Mount the floating trigger against an opt-in rule that owes a choice. */
const renderTrigger = async function renderTrigger(
	triggerShowWhen: ConsentDialogTriggerVisibility | undefined,
	extra: Partial<ConsentConfig> = {}
) {
	const config = {
		consentCategories: ['necessary', 'measurement'],
		triggerShowWhen,
		...extra,
	} as ConsentConfig;
	const context = createVueConsentKernelContext({
		config,
		kernelConfig: {
			initialPolicyResolution: resolvePolicyRules({
				countryCode: 'DE',
				regionCode: null,
				rules: [choiceRule],
			}),
			transport: {
				init: () => Promise.resolve({}),
				save: () => Promise.resolve({ ok: true, subjectId: 'vue-trigger' }),
			},
		},
	});
	const wrapper = mount(ConsentDialogTrigger, {
		attachTo: document.body,
		global: {
			provide: {
				[consentConfigKey as symbol]: config,
				[symbolKernelContext as symbol]: context,
				[symbolKernel as symbol]: context.kernel,
				[symbolSnapshot as symbol]: context.snapshot,
				[symbolInit as symbol]: context.init,
				[symbolActiveUI as symbol]: context.activeUI,
				[symbolConsent as symbol]: context.storedConsent,
			},
		},
	});
	await flushPromises();
	mounted = { context, wrapper };
	return context;
};

afterEach(() => {
	if (mounted) {
		mounted.wrapper.unmount();
		mounted.context.dispose();
		mounted = null;
	}
	document.body.innerHTML = '';
});

describe('ConsentDialogTrigger triggerShowWhen', () => {
	test.each([
		['after-consent', undefined],
		['after-consent', 'after-consent'],
	] as const)(
		'%s (config %s) hides the trigger until the choice is made',
		async (_label, triggerShowWhen) => {
			const context = await renderTrigger(triggerShowWhen);
			expect(context.snapshot.value.promptRequirement.kind).toBe('choice');
			expect(trigger()).toBeNull();

			await context.kernel.commands.save('all');
			await flushPromises();

			expect(context.snapshot.value.promptRequirement.kind).toBe('none');
			expect(trigger()).not.toBeNull();
		}
	);

	test('always shows the trigger while a choice is still owed', async () => {
		const context = await renderTrigger('always');
		expect(context.snapshot.value.promptRequirement.kind).toBe('choice');
		expect(trigger()).not.toBeNull();
	});

	test('never hides the trigger after the choice too', async () => {
		const context = await renderTrigger('never');
		await context.kernel.commands.save('all');
		await flushPromises();
		expect(trigger()).toBeNull();
	});
});

describe('ConsentDialogTrigger disableAnimation', () => {
	test.each([true, false])(
		'marks the trigger for the stylesheet when disableAnimation is %s',
		async (disableAnimation) => {
			await renderTrigger('always', { disableAnimation });
			// The stylesheet stops the hover and snap transitions on it.
			expect(trigger()?.hasAttribute('data-disable-animation')).toBe(
				disableAnimation
			);
		}
	);
});
