import type { Meta, StoryObj } from '@storybook/react-vite';

import { Frame } from '../../../packages/react/src/v3/index';
import { StorybookV3ConsentProvider } from './storybook-v3-fixtures';

const meta = {
	component: Frame,
	parameters: {
		layout: 'centered',
	},
	title: 'COMPONENTS - REACT/V3/Frame',
} satisfies Meta<typeof Frame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {
	render: () => (
		<StorybookV3ConsentProvider
			storedConsent={{
				marketing: false,
				necessary: true,
			}}
		>
			<div style={{ width: '32rem' }}>
				<Frame category="marketing">
					<div>Marketing content</div>
				</Frame>
			</div>
		</StorybookV3ConsentProvider>
	),
};

export const GrantedContent: Story = {
	render: () => (
		<StorybookV3ConsentProvider
			storedConsent={{
				marketing: true,
				necessary: true,
			}}
		>
			<div style={{ width: '32rem' }}>
				<Frame category="marketing">
					<div
						style={{
							background: 'var(--c15t-surface)',
							border: '1px solid var(--c15t-border)',
							borderRadius: '1rem',
							padding: '1.25rem',
						}}
					>
						Embedded marketing content is now visible.
					</div>
				</Frame>
			</div>
		</StorybookV3ConsentProvider>
	),
};
