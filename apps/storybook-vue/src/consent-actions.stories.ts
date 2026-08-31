import type { PolicyUiAction } from '@c15t/schema/types';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import ConsentActions from '../../../packages/vue/src/runtime/components/consent-actions.vue';

const labels: Record<PolicyUiAction, string> = {
	accept: 'Accept all',
	customize: 'Save settings',
	reject: 'Reject all',
};

const meta = {
	component: ConsentActions,
	parameters: {
		layout: 'centered',
	},
	title: 'COMPONENTS - VUE/Core/Consent Actions',
} satisfies Meta<typeof ConsentActions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DialogPolicy: Story = {
	render: () => ({
		components: { ConsentActions },
		setup() {
			const lastAction = ref<PolicyUiAction | null>(null);
			return {
				actionGroups: [['reject', 'accept', 'customize']] as PolicyUiAction[][],
				labels,
				lastAction,
				primaryActions: ['customize'] as PolicyUiAction[],
			};
		},
		template: `
			<div style="display:grid;gap:0.75rem;min-width:min(28rem,100vw - 2rem)">
				<ConsentActions
					:action-groups="actionGroups"
					:labels="labels"
					:primary-actions="primaryActions"
					@action="lastAction = $event"
				/>
				<div aria-live="polite">Last action: {{ lastAction ?? 'none' }}</div>
			</div>
		`,
	}),
};

export const SplitLayout: Story = {
	render: () => ({
		components: { ConsentActions },
		setup() {
			return {
				actionGroups: [
					['reject'],
					['accept', 'customize'],
				] as PolicyUiAction[][],
				labels,
				primaryActions: ['customize'] as PolicyUiAction[],
			};
		},
		template: `
			<div style="min-width:min(28rem,100vw - 2rem)">
				<ConsentActions
					:action-groups="actionGroups"
					:labels="labels"
					:primary-actions="primaryActions"
				/>
			</div>
		`,
	}),
};

export const FilledColumn: Story = {
	render: () => ({
		components: { ConsentActions },
		setup() {
			return {
				actionGroups: [['reject', 'accept', 'customize']] as PolicyUiAction[][],
				labels,
				primaryActions: ['customize'] as PolicyUiAction[],
			};
		},
		template: `
			<div style="min-width:min(22rem,100vw - 2rem)">
				<ConsentActions
					:action-groups="actionGroups"
					direction="column"
					:fill="true"
					:labels="labels"
					:primary-actions="primaryActions"
				/>
			</div>
		`,
	}),
};
