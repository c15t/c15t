/**
 * Vue v3 adapter tests — the shape validator.
 *
 * Goal: prove the c15t/v3 kernel contract is truly framework-neutral by
 * running the same set of invariants we check in React, but against
 * Vue's reactivity primitives (provide/inject, shallowRef, watchers).
 *
 * If these pass, the kernel API is validated for multi-framework
 * leadership and c15t/v3 can promote to stable at v3.0.
 */
import { mount } from '@vue/test-utils';
import type { ConsentKernel } from 'c15t/v3';
import { createConsentKernel } from 'c15t/v3';
import { describe, expect, test } from 'vitest';
import { type Component, defineComponent, h, onUpdated } from 'vue';
import {
	useConsent,
	useConsents,
	useHasConsented,
	useOverrides,
	useSaveConsents,
	useSetConsent,
	useSnapshot,
} from '../composables';
import { ConsentProvider } from '../provider';

function withProvider(child: Component, kernel?: ConsentKernel) {
	const k = kernel ?? createConsentKernel();
	const wrapper = mount({
		components: { ConsentProvider, Child: child },
		setup() {
			return { kernel: k };
		},
		template: `
			<ConsentProvider :kernel="kernel">
				<Child />
			</ConsentProvider>
		`,
	});
	return { kernel: k, wrapper };
}

describe('vue v3: selector composables', () => {
	test('useConsent returns current value and updates on mutation', async () => {
		const child = defineComponent({
			setup() {
				const allowed = useConsent('marketing');
				return () =>
					h('div', { 'data-testid': 'status' }, allowed.value ? 'on' : 'off');
			},
		});

		const { kernel, wrapper } = withProvider(child);
		expect(wrapper.find('[data-testid="status"]').text()).toBe('off');

		kernel.set.consent({ marketing: true });
		await wrapper.vm.$nextTick();
		expect(wrapper.find('[data-testid="status"]').text()).toBe('on');
	});

	test('useConsents returns the full map', async () => {
		const child = defineComponent({
			setup() {
				const consents = useConsents();
				return () =>
					h('pre', { 'data-testid': 'dump' }, JSON.stringify(consents.value));
			},
		});

		const { kernel, wrapper } = withProvider(child);
		expect(wrapper.find('[data-testid="dump"]').text()).toContain(
			'"marketing":false'
		);

		kernel.set.consent({ marketing: true, measurement: true });
		await wrapper.vm.$nextTick();
		expect(wrapper.find('[data-testid="dump"]').text()).toContain(
			'"marketing":true'
		);
	});

	test('useHasConsented flips after save', async () => {
		const child = defineComponent({
			setup() {
				const has = useHasConsented();
				return () => h('div', { 'data-testid': 'has' }, String(has.value));
			},
		});

		const { kernel, wrapper } = withProvider(child);
		expect(wrapper.find('[data-testid="has"]').text()).toBe('false');

		await kernel.commands.save('all');
		await wrapper.vm.$nextTick();
		expect(wrapper.find('[data-testid="has"]').text()).toBe('true');
	});

	test('useOverrides updates on set.overrides', async () => {
		const child = defineComponent({
			setup() {
				const overrides = useOverrides();
				return () =>
					h(
						'div',
						{ 'data-testid': 'country' },
						overrides.value.country ?? 'none'
					);
			},
		});

		const { kernel, wrapper } = withProvider(child);
		expect(wrapper.find('[data-testid="country"]').text()).toBe('none');

		kernel.set.overrides({ country: 'DE' });
		await wrapper.vm.$nextTick();
		expect(wrapper.find('[data-testid="country"]').text()).toBe('DE');
	});

	test('useSnapshot returns the full snapshot', async () => {
		const child = defineComponent({
			setup() {
				const snap = useSnapshot();
				return () =>
					h('div', { 'data-testid': 'rev' }, String(snap.value.revision));
			},
		});

		const { kernel, wrapper } = withProvider(child);
		expect(wrapper.find('[data-testid="rev"]').text()).toBe('0');

		kernel.set.consent({ marketing: true });
		await wrapper.vm.$nextTick();
		expect(wrapper.find('[data-testid="rev"]').text()).toBe('1');
	});

	test('missing provider throws actionable error', () => {
		const child = defineComponent({
			setup() {
				useConsent('marketing');
				return () => h('div');
			},
		});
		expect(() => mount(child)).toThrow(/no kernel in Vue injection scope/);
	});
});

describe('vue v3: zero unrelated re-renders invariant', () => {
	// Same invariant verified in React: flipping marketing must not
	// re-render components that only read measurement. In Vue this maps
	// to onUpdated firing only for components whose selector value
	// changed under Object.is.
	test('flipping marketing does not re-render a measurement-only component', async () => {
		let marketingUpdates = 0;
		let measurementUpdates = 0;

		const MarketingView = defineComponent({
			setup() {
				const allowed = useConsent('marketing');
				onUpdated(() => {
					marketingUpdates += 1;
				});
				return () =>
					h('div', { 'data-testid': 'marketing' }, String(allowed.value));
			},
		});

		const MeasurementView = defineComponent({
			setup() {
				const allowed = useConsent('measurement');
				onUpdated(() => {
					measurementUpdates += 1;
				});
				return () =>
					h('div', { 'data-testid': 'measurement' }, String(allowed.value));
			},
		});

		const kernel = createConsentKernel();
		const wrapper = mount({
			components: { ConsentProvider, MarketingView, MeasurementView },
			setup() {
				return { kernel };
			},
			template: `
				<ConsentProvider :kernel="kernel">
					<MarketingView />
					<MeasurementView />
				</ConsentProvider>
			`,
		});

		await wrapper.vm.$nextTick();
		const marketingBefore = marketingUpdates;
		const measurementBefore = measurementUpdates;

		kernel.set.consent({ marketing: true });
		await wrapper.vm.$nextTick();

		// Marketing's slice changed → component updated.
		expect(marketingUpdates).toBeGreaterThan(marketingBefore);
		// Measurement's slice is unchanged → no update.
		expect(measurementUpdates).toBe(measurementBefore);
	});

	test('no-op mutation triggers zero updates', async () => {
		let updates = 0;
		const View = defineComponent({
			setup() {
				const consents = useConsents();
				onUpdated(() => {
					updates += 1;
				});
				return () =>
					h('pre', { 'data-testid': 'dump' }, JSON.stringify(consents.value));
			},
		});

		const { kernel, wrapper } = withProvider(View);
		await wrapper.vm.$nextTick();
		const before = updates;

		// necessary is already true — kernel must short-circuit.
		kernel.set.consent({ necessary: true });
		await wrapper.vm.$nextTick();
		expect(updates).toBe(before);
	});
});

describe('vue v3: action composables', () => {
	test('useSetConsent mutates the kernel', async () => {
		const child = defineComponent({
			setup() {
				const setConsent = useSetConsent();
				const marketing = useConsent('marketing');
				return () =>
					h('div', [
						h(
							'button',
							{
								'data-testid': 'toggle',
								onClick: () => setConsent({ marketing: true }),
							},
							'toggle'
						),
						h('span', { 'data-testid': 'value' }, String(marketing.value)),
					]);
			},
		});

		const { wrapper } = withProvider(child);
		expect(wrapper.find('[data-testid="value"]').text()).toBe('false');

		await wrapper.find('[data-testid="toggle"]').trigger('click');
		await wrapper.vm.$nextTick();
		expect(wrapper.find('[data-testid="value"]').text()).toBe('true');
	});

	test('useSaveConsents commits via kernel', async () => {
		const child = defineComponent({
			setup() {
				const save = useSaveConsents();
				const has = useHasConsented();
				return () =>
					h('div', [
						h(
							'button',
							{
								'data-testid': 'save',
								onClick: () => {
									void save('all');
								},
							},
							'save'
						),
						h('span', { 'data-testid': 'has' }, String(has.value)),
					]);
			},
		});

		const { kernel, wrapper } = withProvider(child);
		expect(wrapper.find('[data-testid="has"]').text()).toBe('false');

		await wrapper.find('[data-testid="save"]').trigger('click');
		await wrapper.vm.$nextTick();
		await wrapper.vm.$nextTick();

		expect(kernel.getSnapshot().consents.marketing).toBe(true);
		expect(wrapper.find('[data-testid="has"]').text()).toBe('true');
	});
});
