import {
	accordionVariants,
	getAccordionItemState,
	toggleAccordionValue,
} from '@c15t/framework-solid';
import {
	multipleModeToggle,
	singleModeToggle,
} from '@c15t/storybook-tests/play/accordion';
import { createSignal, For } from 'solid-js';
import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { enTranslations } from '../../../packages/translations/src';

const { consentManagerDialog, consentTypes } = enTranslations;

type AccordionType = 'single' | 'multiple';

interface AccordionDemoProps {
	type: AccordionType;
	collapsible?: boolean;
	defaultValue: string | string[];
	items: Array<{ value: string; title: string; content: string }>;
}

function AccordionDemo(props: AccordionDemoProps) {
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
											type: props.type,
											value: value(),
											itemValue: item.value,
											collapsible: props.collapsible,
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
}

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
					value: 'purpose-1',
					title: consentTypes.necessary.title,
					content: consentTypes.necessary.description,
				},
				{
					value: 'purpose-2',
					title: consentTypes.measurement.title,
					content: consentTypes.measurement.description,
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
					value: 'purpose-1',
					title: consentTypes.marketing.title,
					content: consentTypes.marketing.description,
				},
				{
					value: 'purpose-2',
					title: consentTypes.functionality.title,
					content: consentTypes.functionality.description,
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
						value: 'purpose-1',
						title: consentTypes.necessary.title,
						content: consentTypes.necessary.description,
					},
					{
						value: 'purpose-2',
						title: consentTypes.measurement.title,
						content: consentTypes.measurement.description,
					},
				]}
			/>
		</div>
	),
};
