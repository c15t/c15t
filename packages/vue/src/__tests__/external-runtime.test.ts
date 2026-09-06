import { hosted } from '@c15t/core';
import { createConsentRuntime } from '@c15t/core/runtime';
import type { ConsentRuntime } from '@c15t/core/runtime';
import { mount } from '@vue/test-utils';
import { describe, expect, test, vi } from 'vitest';
import { defineComponent, h, inject } from 'vue';

import { c15tVue } from '../index';
import {
	createVueConsentKernelContext,
	startVueConsentRuntime,
} from '../runtime/kernel';
import { symbolKernel } from '../runtime/utils/symbols';

const createRuntime = function createRuntime(): ConsentRuntime {
	return createConsentRuntime({
		mode: hosted({ url: 'https://consent.example.test' }),
		pkg: '@c15t/vue-test',
	});
};

const KernelProbe = defineComponent({
	setup() {
		const kernel = inject(symbolKernel);
		return () => h('div', { 'data-kernel': Boolean(kernel) });
	},
});

describe('createVueConsentKernelContext with an external runtime', () => {
	test('renders the runtime kernel instead of creating one', () => {
		const runtime = createRuntime();
		const context = createVueConsentKernelContext({ config: {}, runtime });

		expect(context.kernel).toBe(runtime.kernel);
		expect(context.ownsKernel).toBe(false);
		expect(context.snapshot.value).toEqual(runtime.kernel.getSnapshot());
	});

	test('does not dispose a kernel it was handed', () => {
		const runtime = createRuntime();
		const dispose = vi.spyOn(runtime.kernel, 'dispose');
		const context = createVueConsentKernelContext({ config: {}, runtime });

		context.dispose();

		expect(dispose).not.toHaveBeenCalled();
		expect(runtime.kernel.getSnapshot()).toBeTruthy();
	});

	test('still owns the kernel when no runtime is passed', () => {
		const context = createVueConsentKernelContext({ config: {} });
		const dispose = vi.spyOn(context.kernel, 'dispose');

		expect(context.ownsKernel).toBe(true);
		context.dispose();
		expect(dispose).toHaveBeenCalled();
	});
});

describe('startVueConsentRuntime with an external runtime', () => {
	test('mounts none of the modules the runtime already owns', () => {
		const runtime = createRuntime();
		const init = vi.spyOn(runtime.kernel.commands, 'init');
		const context = createVueConsentKernelContext({ config: {}, runtime });

		const stop = startVueConsentRuntime(context, {});

		expect(init).not.toHaveBeenCalled();
		expect(
			(window as Window & { c15t?: { pkg: string } }).c15t
		).toBeUndefined();

		stop();
		expect(runtime.kernel.getSnapshot()).toBeTruthy();
	});
});

describe('the c15tVue plugin', () => {
	test('provides the runtime kernel and leaves its lifecycle alone', () => {
		const runtime = createRuntime();
		const dispose = vi.spyOn(runtime.kernel, 'dispose');
		const init = vi.spyOn(runtime.kernel.commands, 'init');

		const wrapper = mount(KernelProbe, {
			global: { plugins: [[c15tVue, { runtime }]] },
		});

		expect(wrapper.vm.$.appContext.provides[symbolKernel as symbol]).toBe(
			runtime.kernel
		);
		expect(init).not.toHaveBeenCalled();

		wrapper.unmount();
		expect(dispose).not.toHaveBeenCalled();
	});
});
