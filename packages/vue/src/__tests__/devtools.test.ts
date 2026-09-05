import { createConsentKernel } from '@c15t/core';
import type { ConsentKernel } from '@c15t/core';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { defineComponent, h, provide, ref } from 'vue';
import type { PropType, VNode } from 'vue';

import ConsentDevToolsDefault, {
	C15TDevTools,
	ConsentDevTools,
	DevTools,
} from '../devtools';
import { symbolKernel } from '../runtime/utils/symbols';

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
