import type { ConsentDialogTriggerVisibility } from '@c15t/schema/config';
import type { PolicyRule } from '@c15t/schema/types';
import { resolvePolicyRules } from '@c15t/schema/types';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import type { ComponentPublicInstance, Ref } from 'vue';

import { ConsentDevTools } from '../devtools';
import ConsentDialogTrigger from '../runtime/components/panel-trigger.vue';
import { consentConfigKey } from '../runtime/composables/config';
import type { ConsentConfig } from '../runtime/config';
import {
	symbolActiveUI,
	symbolConsent,
	symbolInit,
	symbolKernel,
	symbolKernelContext,
	symbolSnapshot,
} from '../runtime/utils/symbols';
import { createVueConsentKernelContext } from './test-kernel';
import type { VueConsentKernelContext } from './test-kernel';

const choiceRule: PolicyRule = {
	id: 'vue_trigger_devtools',
	match: { fallback: true, isDefault: true },
	model: 'opt-in',
	prompt: 'choice',
};

let mounted: {
	context: VueConsentKernelContext;
	wrapper: VueWrapper<ComponentPublicInstance>;
} | null = null;

interface RenderOptions {
	showDevTools?: Ref<boolean>;
	showTrigger?: Ref<boolean>;
	triggerShowWhen?: ConsentDialogTriggerVisibility;
}

/** Mount the floating trigger next to `<ConsentDevTools>` under one kernel. */
const render = async function render({
	showDevTools = ref(true),
	showTrigger = ref(true),
	triggerShowWhen = 'always',
}: RenderOptions = {}) {
	const config = {
		consentCategories: ['necessary', 'measurement'],
		triggerShowWhen,
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
				save: () => Promise.resolve({ ok: true, subjectId: 'vue-devtools' }),
			},
		},
	});
	const Root = defineComponent({
		setup() {
			return () => [
				showDevTools.value ? h(ConsentDevTools) : null,
				showTrigger.value ? h(ConsentDialogTrigger) : null,
			];
		},
	});
	const wrapper = mount(Root, {
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

/** DevTools root inside its shadow host. */
const devToolsRoot = function devToolsRoot(): HTMLElement {
	const root = document
		.querySelector('[data-c15t-dev-tools-host]')
		?.shadowRoot?.querySelector<HTMLElement>('[data-c15t-dev-tools]');
	if (!root) {
		throw new Error('Expected DevTools to be mounted');
	}
	return root;
};

const toolbarActions = () =>
	[
		...document.querySelectorAll<HTMLButtonElement>(
			'[data-c15t-trigger-toolbar] button'
		),
	].map((button) => button.dataset.c15tTriggerAction);

const devToolsItem = () =>
	document.querySelector<HTMLButtonElement>(
		'[data-c15t-trigger-action="devtools"]'
	);

afterEach(() => {
	if (mounted) {
		mounted.wrapper.unmount();
		mounted.context.dispose();
		mounted = null;
	}
	document.body.innerHTML = '';
});

describe('ConsentDialogTrigger with ConsentDevTools', () => {
	test('renders the single button when DevTools is not mounted', async () => {
		await render({ showDevTools: ref(false) });

		expect(
			document.querySelector('[data-testid="consent-dialog-trigger"]')
		).not.toBeNull();
		expect(document.querySelector('[data-c15t-trigger-toolbar]')).toBeNull();
	});

	test('becomes a toolbar that carries the launcher and docks the panel', async () => {
		const context = await render();

		await vi.waitFor(() => expect(devToolsItem()).not.toBeNull());
		expect(
			document.querySelector('[data-testid="consent-dialog-trigger"]')
		).toBeNull();
		// Bottom-right: the DevTools item sits farthest from the corner.
		expect(toolbarActions()).toEqual(['devtools', 'preferences']);
		expect(
			document.querySelector(
				'[data-c15t-trigger-action="preferences"][aria-label="Open privacy settings"]'
			)
		).not.toBeNull();
		expect(devToolsItem()?.getAttribute('aria-label')).toBe('c15t DevTools');
		expect(devToolsRoot().classList).toContain('c15t-dev-tools--docked');

		const item = devToolsItem();
		expect(item?.getAttribute('aria-expanded')).toBe('false');
		item?.click();
		await flushPromises();
		expect(item?.getAttribute('aria-expanded')).toBe('true');
		item?.click();
		await flushPromises();
		expect(item?.getAttribute('aria-expanded')).toBe('false');

		document
			.querySelector<HTMLButtonElement>(
				'[data-c15t-trigger-action="preferences"]'
			)
			?.click();
		expect(context.activeUI.value).toBe('manager');
	});

	test('the floating launcher returns when the trigger unmounts', async () => {
		const showTrigger = ref(true);
		await render({ showTrigger });
		await vi.waitFor(() =>
			expect(devToolsRoot().classList).toContain('c15t-dev-tools--docked')
		);

		showTrigger.value = false;
		await flushPromises();
		expect(devToolsRoot().classList).not.toContain('c15t-dev-tools--docked');
	});

	test('DevTools keeps its own launcher while the trigger is hidden', async () => {
		const context = await render({ triggerShowWhen: 'after-consent' });

		expect(document.querySelector('[data-c15t-trigger]')).toBeNull();
		expect(devToolsRoot().classList).not.toContain('c15t-dev-tools--docked');

		await context.kernel.commands.save('all');
		await flushPromises();
		await vi.waitFor(() => expect(devToolsItem()).not.toBeNull());
		expect(devToolsRoot().classList).toContain('c15t-dev-tools--docked');
	});

	test('the trigger returns to a single button when DevTools unmounts', async () => {
		const showDevTools = ref(true);
		await render({ showDevTools });
		await vi.waitFor(() => expect(devToolsItem()).not.toBeNull());

		showDevTools.value = false;
		await flushPromises();
		expect(document.querySelector('[data-c15t-trigger-toolbar]')).toBeNull();
		expect(
			document.querySelector('[data-testid="consent-dialog-trigger"]')
		).not.toBeNull();
	});
});
