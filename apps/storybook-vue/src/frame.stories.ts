import type { Meta, StoryObj } from '@storybook/vue3-vite';

import ConsentFrame from '../../../packages/vue/src/runtime/components/consent-frame.vue';
import { useStorybookConsent as setupStorybookConsent } from './storybook-consent-fixtures';

const meta = {
	component: ConsentFrame,
	parameters: {
		layout: 'centered',
	},
	title: 'COMPONENTS - VUE/Core/Frame',
} satisfies Meta<typeof ConsentFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

const renderFrame = (granted: boolean) => ({
	components: { ConsentFrame },
	setup() {
		const { kernel } = setupStorybookConsent(null);
		const snapshot = kernel.getSnapshot();
		kernel.hydrate({
			choice: {
				categories: {
					marketing: {
						basis: {
							fingerprint: snapshot.evaluationPolicy.choice.fingerprint,
							kind: 'choice-v1',
						},
						confirmedAt: snapshot.evaluatedAt,
						value: granted,
					},
				},
				version: 3,
			},
			now: snapshot.evaluatedAt,
		});
	},
	template: `
		<div style="width: 32rem;">
			<div>
				<ConsentFrame category="marketing">
					<template #placeholder>
						<div data-testid="frame-placeholder">Marketing content requires consent.</div>
					</template>
					<div data-testid="parity-frame-content" style="border-radius: 1rem; padding: 1.25rem; background: var(--c15t-surface); border: 1px solid var(--c15t-border);">
						Embedded marketing content is now visible.
					</div>
				</ConsentFrame>
			</div>
		</div>
	`,
});

export const Placeholder: Story = {
	render: () => renderFrame(false),
};

export const GrantedContent: Story = {
	render: () => renderFrame(true),
};
