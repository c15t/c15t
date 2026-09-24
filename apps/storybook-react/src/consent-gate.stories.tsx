import type { Meta, StoryObj } from '@storybook/react-vite';

import { ConsentGate } from '../../../packages/react/src/index';
import {
	editableConsentOptions,
	StorybookConsentProvider,
} from './storybook-consent-fixtures';

const meta = {
	component: ConsentGate,
	parameters: {
		layout: 'centered',
	},
	title: 'COMPONENTS - REACT/Core/Consent Gate',
} satisfies Meta<typeof ConsentGate>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {
	render: () => (
		<StorybookConsentProvider
			options={editableConsentOptions}
			storedConsent={{
				marketing: false,
				necessary: true,
			}}
		>
			<div style={{ width: '32rem' }}>
				<ConsentGate
					category="marketing"
					placeholder={
						<div data-testid="frame-placeholder">
							Marketing content requires consent.
						</div>
					}
				>
					<div data-testid="parity-consent-gate-content">Marketing content</div>
				</ConsentGate>
			</div>
		</StorybookConsentProvider>
	),
};

export const GrantedContent: Story = {
	render: () => (
		<StorybookConsentProvider
			options={editableConsentOptions}
			storedConsent={{
				marketing: true,
				necessary: true,
			}}
		>
			<div style={{ width: '32rem' }}>
				<ConsentGate
					category="marketing"
					placeholder={
						<div data-testid="frame-placeholder">
							Marketing content requires consent.
						</div>
					}
				>
					<div
						data-testid="parity-consent-gate-content"
						style={{
							background: 'var(--c15t-surface)',
							border: '1px solid var(--c15t-border)',
							borderRadius: '1rem',
							padding: '1.25rem',
						}}
					>
						Embedded marketing content is now visible.
					</div>
				</ConsentGate>
			</div>
		</StorybookConsentProvider>
	),
};
