import { createConsentKernel } from '@c15t/core';
import type { ConsentKernel } from '@c15t/core';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { defineComponent, h, nextTick, provide, ref } from 'vue';
import type { PropType, VNode } from 'vue';

import ConsentDevToolsDefault, {
	C15TDevTools,
	ConsentDevTools,
	DevTools,
} from '../devtools';
import { consentConfigKey } from '../runtime/composables/config';
import {
	createVueConsentKernelContext,
	startVueConsentRuntime,
} from '../runtime/kernel';
import { symbolKernelContext, symbolKernel } from '../runtime/utils/symbols';

const KernelProvider = defineComponent({
	props: {
		kernel: {
			required: true,
			type: Object as PropType<ConsentKernel>,
		},
	},
	setup(props, { slots }) {
		provide(symbolKernel, props.kernel);
		return () => slots.default?.();
	},
});

const provider = (kernel: ConsentKernel, child: VNode): VNode =>
	h(KernelProvider, { kernel }, () => child);

const mountedDevTools = (): NodeListOf<HTMLElement> =>
	document.querySelectorAll('[data-c15t-dev-tools]');

afterEach(() => {
	for (const element of mountedDevTools()) {
		element.remove();
	}
});

describe('@c15t/vue/devtools', () => {
	test('keeps explicit service callbacks live without remounting', async () => {
		const firstClear = vi.fn();
		const nextClear = vi.fn();
		const clear = ref<() => void>(firstClear);
		const kernel = createConsentKernel();
		const Root = defineComponent({
			setup() {
				provide(consentConfigKey, {
					presentation: { preferences: { primaryActions: ['accept'] } },
				});
				return () =>
					provider(
						kernel,
						h(ConsentDevTools, {
							clearRecords: () => clear.value(),
							defaultOpen: true,
							defaultTab: 'policy',
							getPresentation: () => undefined,
						})
					);
			},
		});
		const wrapper = mount(Root);
		try {
			await vi.waitFor(() => expect(mountedDevTools()).toHaveLength(1));
			const [root] = mountedDevTools();
			expect(root?.textContent).toContain('Resolved defaults only');
			clear.value = nextClear;
			await nextTick();
			expect(mountedDevTools()[0]).toBe(root);
			root?.querySelector<HTMLButtonElement>('[data-tab="actions"]')?.click();
			[...(root?.querySelectorAll('button') ?? [])]
				.find((button) => button.textContent === 'Clear stored records')
				?.click();
			expect(firstClear).not.toHaveBeenCalled();
			expect(nextClear).toHaveBeenCalledOnce();
		} finally {
			wrapper.unmount();
			kernel.dispose();
		}
	});

	test('uses provider presentation and clears its custom persistence key', async () => {
		const storageKey = 'vue-devtools-clear';
		const config = {
			presentation: {
				preferences: { primaryActions: ['accept'] as 'accept'[] },
			},
			storageConfig: { storageKey },
		};
		const context = createVueConsentKernelContext({
			config,
			kernelConfig: { transport: {} },
		});
		const dispose = startVueConsentRuntime(context, config, { runInit: false });
		const Root = defineComponent({
			setup() {
				provide(symbolKernel, context.kernel);
				provide(symbolKernelContext, context);
				provide(consentConfigKey, config);
				return () =>
					h(ConsentDevTools, { defaultOpen: true, defaultTab: 'policy' });
			},
		});
		const wrapper = mount(Root);
		try {
			await vi.waitFor(() =>
				expect(mountedDevTools()[0]?.textContent).toContain('host-options')
			);
			expect(mountedDevTools()[0]?.textContent).toContain(
				'equivalent-prominence-overridden'
			);
			await context.kernel.commands.save('all');
			await vi.waitFor(() =>
				expect(localStorage.getItem(storageKey)).not.toBeNull()
			);
			mountedDevTools()[0]
				?.querySelector<HTMLButtonElement>('[data-tab="actions"]')
				?.click();
			const clear = [
				...(mountedDevTools()[0]?.querySelectorAll('button') ?? []),
			].find((element) => element.textContent === 'Clear stored records');
			expect(clear).toBeDefined();
			clear?.click();
			await vi.waitFor(() =>
				expect(localStorage.getItem(storageKey)).toBeNull()
			);
			expect(context.kernel.getSnapshot().explicitChoice).toBeNull();
		} finally {
			wrapper.unmount();
			dispose();
			localStorage.removeItem(storageKey);
			document.cookie = `${storageKey}=; Max-Age=0; Path=/`;
		}
	});

	test('keeps the panel mounted when a new callback returns the same scope', async () => {
		const getConsentCategories = ref(
			() => ['necessary', 'measurement'] as const
		);
		const kernel = createConsentKernel();
		const Root = defineComponent({
			setup: () => () =>
				provider(
					kernel,
					h(ConsentDevTools, {
						defaultOpen: true,
						getConsentCategories: getConsentCategories.value,
					})
				),
		});
		const wrapper = mount(Root);
		await vi.waitFor(() => expect(mountedDevTools()).toHaveLength(1));
		const [root] = mountedDevTools();
		root?.querySelector<HTMLButtonElement>('[data-tab="events"]')?.click();
		await kernel.commands.save({ measurement: true });
		const events = root?.querySelector('[role="tabpanel"]')?.textContent;
		expect(events).toContain('choice:recorded');
		getConsentCategories.value = () => ['necessary', 'measurement'] as const;
		await nextTick();
		expect(mountedDevTools()[0]).toBe(root);
		expect(
			root?.querySelector('[data-tab="events"]')?.getAttribute('aria-selected')
		).toBe('true');
		expect(root?.querySelector('[role="tabpanel"]')?.textContent).toBe(events);
		wrapper.unmount();
	});
	test('tracks reactive categories returned by a stable getter', async () => {
		const categories = ref<('necessary' | 'marketing' | 'measurement')[]>([
			'necessary',
			'marketing',
		]);
		const kernel = createConsentKernel();
		const getConsentCategories = () => categories.value;
		const Root = defineComponent({
			setup: () => () =>
				provider(
					kernel,
					h(ConsentDevTools, { defaultOpen: true, getConsentCategories })
				),
		});
		const wrapper = mount(Root);
		await vi.waitFor(() =>
			expect(
				document.querySelector('[data-focus-key="consent:marketing"]')
			).not.toBeNull()
		);
		categories.value = ['necessary', 'measurement'];
		await vi.waitFor(() => {
			expect(
				document.querySelector('[data-focus-key="consent:measurement"]')
			).not.toBeNull();
			expect(
				document.querySelector('[data-focus-key="consent:marketing"]')
			).toBeNull();
		});
		const [root] = mountedDevTools();
		await kernel.commands.save({ measurement: true });
		await vi.waitFor(() =>
			expect(
				document.querySelector<HTMLInputElement>(
					'[data-focus-key="consent:measurement"]'
				)?.checked
			).toBe(true)
		);
		expect(mountedDevTools()[0]).toBe(root);
		wrapper.unmount();
	});
	test('updates presentation options without leaving duplicate instances', async () => {
		const position = ref<'top-left' | 'bottom-left'>('top-left');
		const kernel = createConsentKernel();
		const Root = defineComponent({
			setup: () => () =>
				provider(kernel, h(ConsentDevTools, { position: position.value })),
		});
		const wrapper = mount(Root);
		await vi.waitFor(() =>
			expect(document.querySelector('.c15t-dev-tools--top-left')).not.toBeNull()
		);
		position.value = 'bottom-left';
		await vi.waitFor(() =>
			expect(
				document.querySelector('.c15t-dev-tools--bottom-left')
			).not.toBeNull()
		);
		expect(mountedDevTools()).toHaveLength(1);
		wrapper.unmount();
	});
	test('exports compatible component names', () => {
		expect(ConsentDevToolsDefault).toBe(ConsentDevTools);
		expect(DevTools).toBe(ConsentDevTools);
		expect(C15TDevTools).toBe(ConsentDevTools);
	});

	test('requires Vue consent provider context', () => {
		expect(() => mount(ConsentDevTools)).toThrow('[c15t] Kernel not found');
	});

	test('mounts and disposes an isolated engine for each provider', async () => {
		const firstKernel = createConsentKernel();
		const secondKernel = createConsentKernel();
		const Root = defineComponent({
			setup() {
				return () => [
					provider(firstKernel, h(ConsentDevTools, { position: 'top-left' })),
					provider(
						secondKernel,
						h(ConsentDevTools, { position: 'bottom-right' })
					),
				];
			},
		});
		const wrapper = mount(Root);

		await vi.waitFor(() => {
			expect(mountedDevTools()).toHaveLength(2);
		});
		expect(document.querySelector('.c15t-dev-tools--top-left')).not.toBeNull();
		expect(
			document.querySelector('.c15t-dev-tools--bottom-right')
		).not.toBeNull();

		wrapper.unmount();
		expect(mountedDevTools()).toHaveLength(0);
	});
});
