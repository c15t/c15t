import { collapsibleVariants, getOpenState } from '@c15t/framework-solid';
import {
	startsClosedByDefault,
	toggleOpenClose,
} from '@c15t/storybook-tests/play/collapsible';
import { createSignal, Show } from 'solid-js';
import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { enTranslations } from '../../../packages/translations/src';

const { consentTypes } = enTranslations;

interface CollapsibleDemoProps {
	defaultOpen?: boolean;
	title: string;
	description: string;
}

function CollapsibleDemo(props: CollapsibleDemoProps) {
	const [open, setOpen] = createSignal(props.defaultOpen ?? true);
	const classes = collapsibleVariants();

	return (
		<div class={classes.root()} style={{ width: '32rem' }}>
			<div
				style={{
					border: '1px solid var(--c15t-border)',
					'border-radius': 'var(--c15t-radius-md)',
					display: 'grid',
					gap: '0.75rem',
					padding: '1rem',
				}}
			>
				<button
					class={classes.trigger()}
					type="button"
					style={{
						'align-items': 'center',
						display: 'flex',
						'font-weight': '600',
						'justify-content': 'space-between',
						width: '100%',
					}}
					onClick={() => setOpen(!open())}
				>
					<span>{props.title}</span>
					<span aria-hidden="true">+</span>
				</button>
				<div class={classes.content()} data-state={getOpenState(open())}>
					<Show when={open()}>
						<p style={{ margin: '0' }}>{props.description}</p>
					</Show>
				</div>
			</div>
		</div>
	);
}

const meta = {
	component: CollapsibleDemo,
	parameters: {
		layout: 'centered',
	},
	title: 'Primitives/Collapsible',
} satisfies Meta<typeof CollapsibleDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: toggleOpenClose,
	render: () => (
		<CollapsibleDemo
			defaultOpen
			title={consentTypes.measurement.title}
			description={consentTypes.measurement.description}
		/>
	),
};

export const ClosedByDefault: Story = {
	play: startsClosedByDefault,
	render: () => (
		<CollapsibleDemo
			defaultOpen={false}
			title={consentTypes.functionality.title}
			description={consentTypes.functionality.description}
		/>
	),
};
