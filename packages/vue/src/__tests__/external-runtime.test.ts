import { hosted } from '@c15t/core';
import { createConsentRuntime } from '@c15t/core/runtime';
import type { ConsentRuntime } from '@c15t/core/runtime';
import { resolvePolicyRules } from '@c15t/schema/types';
import { mount } from '@vue/test-utils';
import { describe, expect, test, vi } from 'vitest';
import { defineComponent, h, inject } from 'vue';

import { createIAB } from '../../../iab/src';
import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import { c15tVue } from '../index';
import { createVueConsentKernelContext } from '../runtime/kernel';
import { symbolKernel } from '../runtime/utils/symbols';

const createRuntime = function createRuntime(): ConsentRuntime {
	return createConsentRuntime({
		mode: hosted({ backendURL: 'https://consent.example.test' }),
		pkg: '@c15t/vue-test',
		prefetch: {
			initialPolicyResolution: resolvePolicyRules({
				countryCode: null,
				regionCode: null,
				rules: [
					{
						categories: ['measurement'],
						id: 'borrowed-runtime',
						match: { fallback: true },
						model: 'opt-in',
						prompt: 'choice',
					},
				],
			}),
		},
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
		const context = createVueConsentKernelContext({
			config: {},
			mode: hosted({ backendURL: '/api/c15t' }),
		});
		const dispose = vi.spyOn(context.kernel, 'dispose');

		expect(context.ownsKernel).toBe(true);
		context.dispose();
		expect(dispose).toHaveBeenCalled();
	});
});

describe('starting a context around an external runtime', () => {
	test('mounts none of the modules the runtime already owns', () => {
		const runtime = createRuntime();
		expect(runtime.kernel.getSnapshot().policyPending).toBe(false);
		expect(runtime.kernel.getSnapshot().effectivePermissions.measurement).toBe(
			false
		);
		const init = vi.spyOn(runtime.kernel.commands, 'init');
		const context = createVueConsentKernelContext({ config: {}, runtime });

		localStorage.setItem('analytics:visitor', 'owner');
		context.start();
		const { dispose: stop } = context;
		expect(localStorage.getItem('analytics:visitor')).toBe('owner');
		localStorage.removeItem('analytics:visitor');

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

test('tracks external IAB handle changes and unsubscribes on disposal', () => {
	const runtime = createRuntime();
	const handle = createIAB({
		cmpId: 28,
		gvl: completeGVL,
		kernel: runtime.kernel,
		persistence: false,
	});
	let notify: Parameters<ConsentRuntime['subscribe']>[0] = () => {};
	let mounted: ConsentRuntime['iab'] = null;
	const unsubscribe = vi.fn();
	vi.spyOn(runtime, 'iab', 'get').mockImplementation(() => mounted);
	vi.spyOn(runtime, 'subscribe').mockImplementation((listener) => {
		notify = listener;
		return unsubscribe;
	});
	const changed = (next: ConsentRuntime['iab']) => {
		mounted = next;
		notify();
	};
	const context = createVueConsentKernelContext({ config: {}, runtime });
	try {
		changed(handle);
		expect(context.iab).toBe(handle);
		const replacement = { ...handle };
		changed(replacement);
		expect(context.iab).toBe(replacement);
		changed(null);
		expect(context.iab).toBeUndefined();
		context.dispose();
		expect(unsubscribe).toHaveBeenCalledOnce();
	} finally {
		handle.dispose();
		runtime.dispose();
	}
});
