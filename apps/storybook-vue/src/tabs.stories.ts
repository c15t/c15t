import {
	keyboardNavigation,
	tabSwitching,
} from '@c15t/storybook-tests/play/tabs';
import { getNextTabValue, tabsVariants } from '@c15t/vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, nextTick, ref } from 'vue';

const meta = {
	parameters: {
		layout: 'centered',
	},
	title: 'Primitives/Tabs',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const variants = tabsVariants();
const triggerValues = ['overview', 'vendors', 'storage'];

export const Default: Story = {
	play: tabSwitching,
	render: () => ({
		setup() {
			const activeTab = ref('overview');
			const rootClass = variants.root();
			const listClass = variants.list();
			const triggerClass = variants.trigger();
			const contentClass = variants.content();

			const selectTab = (value: string) => {
				activeTab.value = value;
			};

			const onKeydown = (event: KeyboardEvent) => {
				const next = getNextTabValue({
					orientation: 'horizontal',
					loop: true,
					triggerValues,
					currentValue: activeTab.value,
					key: event.key,
				});
				if (next !== activeTab.value) {
					const currentEl = event.currentTarget as HTMLElement;
					activeTab.value = next;
					nextTick(() => {
						const target = currentEl
							?.closest('[role="tablist"]')
							?.querySelector(
								`[role="tab"][data-value="${next}"]`
							) as HTMLElement | null;
						target?.focus();
					});
				}
			};

			return {
				activeTab,
				rootClass,
				listClass,
				triggerClass,
				contentClass,
				selectTab,
				onKeydown,
			};
		},
		template: `
			<div :class="rootClass">
				<div :class="listClass" role="tablist" aria-orientation="horizontal">
					<button
						v-for="tab in ['overview', 'vendors', 'storage']"
						:key="tab"
						:class="triggerClass"
						role="tab"
						:aria-selected="String(activeTab === tab)"
						:data-state="activeTab === tab ? 'active' : 'inactive'"
						:data-value="tab"
						:tabindex="activeTab === tab ? 0 : -1"
						type="button"
						@click="selectTab(tab)"
						@keydown="onKeydown"
					>
						{{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
					</button>
				</div>
				<div
					v-if="activeTab === 'overview'"
					:class="contentClass"
					role="tabpanel"
					style="border:1px solid var(--c15t-border);border-radius:var(--c15t-radius-md);display:grid;gap:0.5rem;padding:1rem;width:28rem"
				>
					<strong>Overview</strong>
					<p style="margin:0">Use tabs for grouped content that shares a single disclosure region.</p>
				</div>
				<div
					v-if="activeTab === 'vendors'"
					:class="contentClass"
					role="tabpanel"
					style="border:1px solid var(--c15t-border);border-radius:var(--c15t-radius-md);display:grid;gap:0.5rem;padding:1rem;width:28rem"
				>
					<strong>Vendors</strong>
					<p style="margin:0">The IAB dialog uses this pattern for purposes and vendor disclosures.</p>
				</div>
				<div
					v-if="activeTab === 'storage'"
					:class="contentClass"
					role="tabpanel"
					style="border:1px solid var(--c15t-border);border-radius:var(--c15t-radius-md);display:grid;gap:0.5rem;padding:1rem;width:28rem"
				>
					<strong>Storage</strong>
					<p style="margin:0">Keyboard navigation supports arrow keys, Home, and End.</p>
				</div>
			</div>
		`,
	}),
};

export const KeyboardNavigation: Story = {
	play: keyboardNavigation,
	render: () => ({
		setup() {
			const activeTab = ref('overview');
			const rootClass = variants.root();
			const listClass = variants.list();
			const triggerClass = variants.trigger();
			const contentClass = variants.content();

			const selectTab = (value: string) => {
				activeTab.value = value;
			};

			const onKeydown = (event: KeyboardEvent) => {
				const next = getNextTabValue({
					orientation: 'horizontal',
					loop: true,
					triggerValues,
					currentValue: activeTab.value,
					key: event.key,
				});
				if (next !== activeTab.value) {
					const currentEl = event.currentTarget as HTMLElement;
					activeTab.value = next;
					nextTick(() => {
						const target = currentEl
							?.closest('[role="tablist"]')
							?.querySelector(
								`[role="tab"][data-value="${next}"]`
							) as HTMLElement | null;
						target?.focus();
					});
				}
			};

			return {
				activeTab,
				rootClass,
				listClass,
				triggerClass,
				contentClass,
				selectTab,
				onKeydown,
			};
		},
		template: `
			<div :class="rootClass">
				<div :class="listClass" role="tablist" aria-orientation="horizontal">
					<button
						v-for="tab in ['overview', 'vendors', 'storage']"
						:key="tab"
						:class="triggerClass"
						role="tab"
						:aria-selected="String(activeTab === tab)"
						:data-state="activeTab === tab ? 'active' : 'inactive'"
						:data-value="tab"
						:tabindex="activeTab === tab ? 0 : -1"
						type="button"
						@click="selectTab(tab)"
						@keydown="onKeydown"
					>
						{{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
					</button>
				</div>
				<div
					v-if="activeTab === 'overview'"
					:class="contentClass"
					role="tabpanel"
					style="border:1px solid var(--c15t-border);border-radius:var(--c15t-radius-md);display:grid;gap:0.5rem;padding:1rem;width:28rem"
				>
					<strong>Overview</strong>
				</div>
				<div
					v-if="activeTab === 'vendors'"
					:class="contentClass"
					role="tabpanel"
					style="border:1px solid var(--c15t-border);border-radius:var(--c15t-radius-md);display:grid;gap:0.5rem;padding:1rem;width:28rem"
				>
					<strong>Vendors</strong>
				</div>
				<div
					v-if="activeTab === 'storage'"
					:class="contentClass"
					role="tabpanel"
					style="border:1px solid var(--c15t-border);border-radius:var(--c15t-radius-md);display:grid;gap:0.5rem;padding:1rem;width:28rem"
				>
					<strong>Storage</strong>
				</div>
			</div>
		`,
	}),
};
