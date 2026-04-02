import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ConsentWidget } from '../../../packages/react/src/index';
import {
	editableConsentOptions,
	editableStoredConsent,
	StorybookConsentProvider,
} from './storybook-consent-fixtures';

const meta = {
	component: ConsentWidget,
	parameters: {
		layout: 'centered',
	},
	title: 'Components/Core/Consent Widget',
} satisfies Meta<typeof ConsentWidget>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<StorybookConsentProvider
			options={editableConsentOptions}
			storedConsent={editableStoredConsent}
		>
			<div style={{ width: '32rem' }}>
				<ConsentWidget />
			</div>
		</StorybookConsentProvider>
	),
};

export const ExpandedCategories: Story = {
	render: () => (
		<StorybookConsentProvider
			options={editableConsentOptions}
			storedConsent={editableStoredConsent}
		>
			<div style={{ width: '32rem' }}>
				<ConsentWidget />
			</div>
		</StorybookConsentProvider>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const functionalityTrigger = await canvas.findByTestId(
			'consent-widget-accordion-trigger-functionality'
		);
		const analyticsTrigger = await canvas.findByTestId(
			'consent-widget-accordion-trigger-measurement'
		);
		const functionalityContent = await canvas.findByTestId(
			'consent-widget-accordion-content-functionality'
		);
		const analyticsContent = await canvas.findByTestId(
			'consent-widget-accordion-content-measurement'
		);

		await userEvent.click(functionalityTrigger);
		await expect(functionalityContent).toHaveAttribute('data-state', 'open');
		await expect(analyticsContent).toHaveAttribute('data-state', 'closed');

		await userEvent.click(analyticsTrigger);
		await expect(functionalityContent).toHaveAttribute('data-state', 'closed');
		await expect(analyticsContent).toHaveAttribute('data-state', 'open');
	},
};
