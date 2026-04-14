import type { Meta, StoryObj } from '@storybook/react-vite';
import { Frame } from '../../../packages/react/src/index';
import { StorybookConsentProvider } from './storybook-consent-fixtures';

const meta = {
	component: Frame,
	parameters: {
		layout: 'centered',
	},
	title: 'Components/Core/Frame',
} satisfies Meta<typeof Frame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {
	render: () => (
		<StorybookConsentProvider>
			<div style={{ width: '32rem' }}>
				<Frame category="marketing">
					<div>Marketing content</div>
				</Frame>
			</div>
		</StorybookConsentProvider>
	),
};

export const GrantedContent: Story = {
	render: () => (
		<StorybookConsentProvider
			storedConsent={{
				necessary: true,
				marketing: true,
			}}
		>
			<div style={{ width: '32rem' }}>
				<Frame category="marketing">
					<div
						style={{
							borderRadius: '1rem',
							padding: '1.25rem',
							background: 'var(--c15t-surface)',
							border: '1px solid var(--c15t-border)',
						}}
					>
						Embedded marketing content is now visible.
					</div>
				</Frame>
			</div>
		</StorybookConsentProvider>
	),
};
