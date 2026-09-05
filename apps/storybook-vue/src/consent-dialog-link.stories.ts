import { linkOpensDialog } from '@c15t/conformance/play/consent-dialog-link';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

import ConsentManager from '../../../packages/vue/src/runtime/components/consent-manager.vue';
import ConsentPreferencesLink from '../../../packages/vue/src/runtime/components/consent-preferences-link.vue';
import { useStorybookConsent as setupStorybookConsent } from './storybook-consent-fixtures';

const meta = {
	component: ConsentPreferencesLink,
	parameters: {
		layout: 'centered',
	},
	title: 'COMPONENTS - VUE/Core/Consent Dialog Link',
} satisfies Meta<typeof ConsentPreferencesLink>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: linkOpensDialog,
	render: () => ({
		components: { ConsentManager, ConsentPreferencesLink },
		setup() {
			const { kernel } = setupStorybookConsent(null);
			const snapshot = kernel.getSnapshot();
			kernel.hydrate({
				choice: {
					categories: Object.fromEntries(
						['functionality', 'measurement', 'experience', 'marketing'].map(
							(category) => [
								category,
								{
									basis: {
										fingerprint: snapshot.evaluationPolicy.choice.fingerprint,
										kind: 'choice-v1' as const,
									},
									confirmedAt: snapshot.evaluatedAt,
									value: false,
								},
							]
						)
					),
				},
				now: snapshot.evaluatedAt,
			});
		},
		template: `
			<div style="padding: 2rem;">
				<ConsentPreferencesLink>Privacy preferences</ConsentPreferencesLink>
				<ConsentManager />
			</div>
		`,
	}),
};
