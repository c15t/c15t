import { getSwitchState, switchVariants, toggleSwitchValue } from '@c15t/solid';
import {
	controlledToggle,
	toggleOnOff,
} from '@c15t/storybook-tests/play/switch';
import { createSignal } from 'solid-js';
import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { enTranslations } from '../../../packages/translations/src';

const { consentTypes } = enTranslations;

function SwitchDemo(props: {
	defaultChecked?: boolean;
	disabled?: boolean;
	size?: 'small' | 'medium';
	label?: string;
}) {
	const [checked, setChecked] = createSignal(props.defaultChecked ?? false);
	const classes = switchVariants({ size: props.size });

	return (
		<label
			style={{
				'align-items': 'center',
				display: 'inline-flex',
				gap: '0.75rem',
			}}
		>
			<button
				class={classes.root()}
				role="switch"
				aria-checked={String(checked())}
				aria-label={props.label ?? 'Enable analytics'}
				data-state={getSwitchState(checked())}
				data-disabled={props.disabled ? '' : undefined}
				disabled={props.disabled}
				type="button"
				onClick={() => {
					if (!props.disabled) {
						setChecked(toggleSwitchValue(checked()));
					}
				}}
			>
				<span class={classes.track()}>
					<span class={classes.thumb()} />
				</span>
			</button>
			<span>{props.label ?? consentTypes.measurement.title}</span>
		</label>
	);
}

const meta = {
	component: SwitchDemo,
	parameters: {
		layout: 'centered',
	},
	title: 'Primitives/Switch',
} satisfies Meta<typeof SwitchDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
	play: toggleOnOff,
	render: () => (
		<div style={{ display: 'grid', gap: '0.75rem' }}>
			<SwitchDemo label={consentTypes.measurement.title} />
		</div>
	),
};

export const Checked: Story = {
	render: () => (
		<div style={{ display: 'grid', gap: '0.75rem' }}>
			<SwitchDemo defaultChecked label={consentTypes.measurement.title} />
		</div>
	),
};

export const Controlled: Story = {
	play: controlledToggle,
	render: () => {
		const [checked, setChecked] = createSignal(true);
		const classes = switchVariants();

		return (
			<div style={{ display: 'grid', gap: '0.75rem' }}>
				<label
					style={{
						'align-items': 'center',
						display: 'inline-flex',
						gap: '0.75rem',
					}}
				>
					<button
						class={classes.root()}
						role="switch"
						aria-checked={String(checked())}
						aria-label="Functional cookies"
						data-state={getSwitchState(checked())}
						type="button"
						onClick={() => setChecked(toggleSwitchValue(checked()))}
					>
						<span class={classes.track()}>
							<span class={classes.thumb()} />
						</span>
					</button>
					<span>{consentTypes.functionality.title}</span>
				</label>
				<div aria-live="polite">
					State: {checked() ? 'enabled' : 'disabled'}
				</div>
			</div>
		);
	},
};

export const Disabled: Story = {
	render: () => (
		<div style={{ display: 'grid', gap: '0.75rem' }}>
			<SwitchDemo disabled label={consentTypes.measurement.title} />
		</div>
	),
};

export const Sizes: Story = {
	render: () => (
		<div style={{ display: 'grid', gap: '1rem' }}>
			<SwitchDemo defaultChecked label={consentTypes.necessary.title} />
			<SwitchDemo
				defaultChecked
				size="small"
				label={consentTypes.functionality.title}
			/>
		</div>
	),
};
