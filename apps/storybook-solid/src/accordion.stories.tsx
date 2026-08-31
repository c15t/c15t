import {
	multipleModeToggle,
	singleModeToggle,
} from '@c15t/conformance/play/accordion';
import {
	accordionVariants,
	getAccordionItemState,
	toggleAccordionValue,
} from '@c15t/solid';
import { createSignal, For } from 'solid-js';
import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { enTranslations } from '../../../packages/translations/src';

const { consentManagerDialog, consentTypes } = enTranslations;

type AccordionType = 'single' | 'multiple';

interface AccordionDemoProps {
	type: AccordionType;
	collapsible?: boolean;
	defaultValue: string | string[];
	items: { value: string; title: string; content: string }[];
}

const AccordionDemo = (props: AccordionDemoProps) => {
	const [value, setValue] = createSignal<string | string[] | undefined>(
		props.defaultValue
	);
	const classes = accordionVariants();

	return (
		<div
			class={classes.root()}
			style={{ display: 'grid', gap: '0.75rem', width: '28rem' }}
		>
			<For each={props.items}>
				{(item) => {
					const itemState = () =>
						getAccordionItemState(props.type, value(), item.value);

					return (
						<div
							class={classes.item()}
							data-slot="accordion-item"
							data-state={itemState()}
						>
							<button
								class={classes.trigger()}
								type="button"
								onClick={() =>
									setValue(
										toggleAccordionValue({
											collapsible: props.collapsible,
											itemValue: item.value,
											type: props.type,
											value: value(),
										})
									)
								}
							>
								<span>{item.title}</span>
								<span aria-hidden="true">
									{itemState() === 'open' ? '-' : '+'}
								</span>
							</button>
							<div
								class={classes.content()}
								data-slot="accordion-content"
								data-state={itemState()}
							>
								<div data-slot="accordion-content-viewport">
									<div class={classes.contentInner()}>{item.content}</div>
								</div>
							</div>
						</div>
					);
				}}
			</For>
		</div>
	);
};

const meta = {
	component: AccordionDemo,
	parameters: {
		layout: 'centered',
	},
	title: 'Primitives/Accordion',
} satisfies Meta<typeof AccordionDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Single: Story = {
	play: singleModeToggle,
	render: () => (
		<AccordionDemo
			type="single"
			collapsible
			defaultValue="purpose-1"
			items={[
				{
					content: consentTypes.necessary.description,
					title: consentTypes.necessary.title,
					value: 'purpose-1',
				},
				{
					content: consentTypes.measurement.description,
					title: consentTypes.measurement.title,
					value: 'purpose-2',
				},
			]}
		/>
	),
};

export const Multiple: Story = {
	play: multipleModeToggle,
	render: () => (
		<AccordionDemo
			type="multiple"
			defaultValue={['purpose-1', 'purpose-2']}
			items={[
				{
					content: consentTypes.marketing.description,
					title: consentTypes.marketing.title,
					value: 'purpose-1',
				},
				{
					content: consentTypes.functionality.description,
					title: consentTypes.functionality.title,
					value: 'purpose-2',
				},
			]}
		/>
	),
};

export const WithIntroduction: Story = {
	render: () => (
		<div style={{ display: 'grid', gap: '1rem', width: '32rem' }}>
			<div style={{ display: 'grid', gap: '0.5rem' }}>
				<h3 style={{ 'font-size': '1.25rem', margin: '0' }}>
					{consentManagerDialog.title}
				</h3>
				<p style={{ color: 'var(--c15t-text-muted)', margin: '0' }}>
					{consentManagerDialog.description}
				</p>
			</div>
			<AccordionDemo
				type="single"
				collapsible
				defaultValue="purpose-1"
				items={[
					{
						content: consentTypes.necessary.description,
						title: consentTypes.necessary.title,
						value: 'purpose-1',
					},
					{
						content: consentTypes.measurement.description,
						title: consentTypes.measurement.title,
						value: 'purpose-2',
					},
				]}
			/>
		</div>
	),
};
