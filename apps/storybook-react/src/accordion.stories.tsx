import {
	multipleModeToggle,
	singleModeToggle,
} from '@c15t/conformance/play/accordion';
import { Accordion } from '@c15t/react/primitives';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type React from 'react';
import { enTranslations } from '../../../packages/translations/src';

const meta = {
	component: Accordion.Root,
	parameters: {
		layout: 'centered',
	},
	title: 'PRIMITIVES - REACT/Accordion',
} satisfies Meta<typeof Accordion.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

const { consentManagerDialog, consentTypes } = enTranslations;

type StoryIconProps = React.HTMLAttributes<HTMLSpanElement>;

const PlusIcon = ({ className, ...props }: StoryIconProps) => (
	<span aria-hidden="true" className={className} {...props}>
		+
	</span>
);

const MinusIcon = ({ className, ...props }: StoryIconProps) => (
	<span aria-hidden="true" className={className} {...props}>
		-
	</span>
);

export const Single: Story = {
	play: singleModeToggle,
	render: () => (
		<div style={{ display: 'grid', gap: '0.75rem', width: '28rem' }}>
			<Accordion.Root type="single" collapsible defaultValue="purpose-1">
				<Accordion.Item value="purpose-1">
					<Accordion.Trigger>
						<span>{consentTypes.necessary.title}</span>
						<Accordion.Arrow
							openIcon={{ Element: PlusIcon }}
							closeIcon={{ Element: MinusIcon }}
						/>
					</Accordion.Trigger>
					<Accordion.Content>
						{consentTypes.necessary.description}
					</Accordion.Content>
				</Accordion.Item>
				<Accordion.Item value="purpose-2">
					<Accordion.Trigger>
						<span>{consentTypes.measurement.title}</span>
						<Accordion.Arrow
							openIcon={{ Element: PlusIcon }}
							closeIcon={{ Element: MinusIcon }}
						/>
					</Accordion.Trigger>
					<Accordion.Content>
						{consentTypes.measurement.description}
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>
		</div>
	),
};

export const Multiple: Story = {
	play: multipleModeToggle,
	render: () => (
		<div style={{ display: 'grid', gap: '0.75rem', width: '28rem' }}>
			<Accordion.Root type="multiple" defaultValue={['purpose-1', 'purpose-2']}>
				<Accordion.Item value="purpose-1">
					<Accordion.Trigger>
						<span>{consentTypes.marketing.title}</span>
						<Accordion.Arrow
							openIcon={{ Element: PlusIcon }}
							closeIcon={{ Element: MinusIcon }}
						/>
					</Accordion.Trigger>
					<Accordion.Content>
						{consentTypes.marketing.description}
					</Accordion.Content>
				</Accordion.Item>
				<Accordion.Item value="purpose-2">
					<Accordion.Trigger>
						<span>{consentTypes.functionality.title}</span>
						<Accordion.Arrow
							openIcon={{ Element: PlusIcon }}
							closeIcon={{ Element: MinusIcon }}
						/>
					</Accordion.Trigger>
					<Accordion.Content>
						{consentTypes.functionality.description}
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>
		</div>
	),
};

export const WithIntroduction: Story = {
	render: () => (
		<div style={{ display: 'grid', gap: '1rem', width: '32rem' }}>
			<div style={{ display: 'grid', gap: '0.5rem' }}>
				<h3 style={{ fontSize: '1.25rem', margin: 0 }}>
					{consentManagerDialog.title}
				</h3>
				<p style={{ color: 'var(--c15t-text-muted)', margin: 0 }}>
					{consentManagerDialog.description}
				</p>
			</div>
			<Accordion.Root type="single" collapsible defaultValue="purpose-1">
				<Accordion.Item value="purpose-1">
					<Accordion.Trigger>
						<span>{consentTypes.necessary.title}</span>
						<Accordion.Arrow
							openIcon={{ Element: PlusIcon }}
							closeIcon={{ Element: MinusIcon }}
						/>
					</Accordion.Trigger>
					<Accordion.Content>
						{consentTypes.necessary.description}
					</Accordion.Content>
				</Accordion.Item>
				<Accordion.Item value="purpose-2">
					<Accordion.Trigger>
						<span>{consentTypes.measurement.title}</span>
						<Accordion.Arrow
							openIcon={{ Element: PlusIcon }}
							closeIcon={{ Element: MinusIcon }}
						/>
					</Accordion.Trigger>
					<Accordion.Content>
						{consentTypes.measurement.description}
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>
		</div>
	),
};
