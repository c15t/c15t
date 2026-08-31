import { keyboardNavigation, tabSwitching } from '@c15t/conformance/play/tabs';
import { tabsVariants } from '@c15t/solid';
import { createSignal, For, Show } from 'solid-js';
import type { Meta, StoryObj } from 'storybook-solidjs-vite';

const getDefined = <Value,>(
	value: Value,
	message = 'Expected value to be defined'
): NonNullable<Value> => {
	if (value === null || value === undefined) {
		throw new Error(message);
	}
	return value;
};

interface Tab {
	value: string;
	label: string;
	content: string;
}

const defaultTabs: Tab[] = [
	{
		content:
			'Use tabs for grouped content that shares a single disclosure region.',
		label: 'Overview',
		value: 'overview',
	},
	{
		content:
			'The IAB dialog uses this pattern for purposes and vendor disclosures.',
		label: 'Vendors',
		value: 'vendors',
	},
	{
		content: 'Keyboard navigation supports arrow keys, Home, and End.',
		label: 'Storage',
		value: 'storage',
	},
];

const TabsDemo = (props: { tabs?: Tab[] }) => {
	const tabs = () => props.tabs ?? defaultTabs;
	const [active, setActive] = createSignal('overview');
	const classes = tabsVariants();

	const handleKeyDown = function handleKeyDown(e: KeyboardEvent) {
		const tabValues = tabs().map((t) => t.value);
		const currentIndex = tabValues.indexOf(active());

		let nextIndex: number | undefined;

		if (e.key === 'ArrowRight') {
			nextIndex = (currentIndex + 1) % tabValues.length;
		} else if (e.key === 'ArrowLeft') {
			nextIndex = (currentIndex - 1 + tabValues.length) % tabValues.length;
		} else if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			const focused = document.activeElement as HTMLElement | null;
			const focusedValue = focused?.getAttribute('data-value');
			if (focusedValue) {
				setActive(focusedValue);
			}
			return;
		}

		if (nextIndex !== undefined) {
			e.preventDefault();
			const nextValue = getDefined(tabValues[nextIndex]);
			setActive(nextValue);
			const tabList = e.currentTarget as HTMLElement;
			const nextTab = tabList.querySelector(
				`[data-value="${nextValue}"]`
			) as HTMLElement | null;
			nextTab?.focus();
		}
	};

	return (
		<div class={classes.root()}>
			<div
				class={classes.list()}
				role="tablist"
				onKeyDown={handleKeyDown}
				tabIndex={-1}
			>
				<For each={tabs()}>
					{(tab) => (
						<button
							class={classes.trigger()}
							role="tab"
							type="button"
							aria-selected={String(active() === tab.value)}
							data-state={active() === tab.value ? 'active' : 'inactive'}
							data-value={tab.value}
							tabIndex={active() === tab.value ? 0 : -1}
							onClick={() => setActive(tab.value)}
						>
							{tab.label}
						</button>
					)}
				</For>
			</div>
			<For each={tabs()}>
				{(tab) => (
					<Show when={active() === tab.value}>
						<div
							class={classes.content()}
							role="tabpanel"
							style={{
								border: '1px solid var(--c15t-border)',
								'border-radius': 'var(--c15t-radius-md)',
								display: 'grid',
								gap: '0.5rem',
								padding: '1rem',
								width: '28rem',
							}}
						>
							<strong>{tab.label}</strong>
							<p style={{ margin: '0' }}>{tab.content}</p>
						</div>
					</Show>
				)}
			</For>
		</div>
	);
};

const meta = {
	component: TabsDemo,
	parameters: {
		layout: 'centered',
	},
	title: 'Primitives/Tabs',
} satisfies Meta<typeof TabsDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: tabSwitching,
	render: () => <TabsDemo />,
};

export const KeyboardNavigation: Story = {
	play: keyboardNavigation,
	render: () => <TabsDemo />,
};

export const Controlled: Story = {
	render: () => {
		const [value, setValue] = createSignal('vendors');
		const classes = tabsVariants();

		const handleKeyDown = function handleKeyDown(e: KeyboardEvent) {
			const tabValues = ['overview', 'vendors'];
			const currentIndex = tabValues.indexOf(value());

			let nextIndex: number | undefined;

			if (e.key === 'ArrowRight') {
				nextIndex = (currentIndex + 1) % tabValues.length;
			} else if (e.key === 'ArrowLeft') {
				nextIndex = (currentIndex - 1 + tabValues.length) % tabValues.length;
			} else if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				const focused = document.activeElement as HTMLElement | null;
				const focusedValue = focused?.getAttribute('data-value');
				if (focusedValue) {
					setValue(focusedValue);
				}
				return;
			}

			if (nextIndex !== undefined) {
				e.preventDefault();
				const nextValue = getDefined(tabValues[nextIndex]);
				setValue(nextValue);
				const tabList = e.currentTarget as HTMLElement;
				const nextTab = tabList.querySelector(
					`[data-value="${nextValue}"]`
				) as HTMLElement | null;
				nextTab?.focus();
			}
		};

		return (
			<div class={classes.root()}>
				<div
					tabIndex={0}
					class={classes.list()}
					role="tablist"
					onKeyDown={handleKeyDown}
				>
					<button
						class={classes.trigger()}
						role="tab"
						type="button"
						aria-selected={String(value() === 'overview')}
						data-state={value() === 'overview' ? 'active' : 'inactive'}
						data-value="overview"
						tabIndex={value() === 'overview' ? 0 : -1}
						onClick={() => setValue('overview')}
					>
						Overview
					</button>
					<button
						class={classes.trigger()}
						role="tab"
						type="button"
						aria-selected={String(value() === 'vendors')}
						data-state={value() === 'vendors' ? 'active' : 'inactive'}
						data-value="vendors"
						tabIndex={value() === 'vendors' ? 0 : -1}
						onClick={() => setValue('vendors')}
					>
						Vendors
					</button>
				</div>
				<Show when={value() === 'overview'}>
					<div
						class={classes.content()}
						role="tabpanel"
						style={{
							border: '1px solid var(--c15t-border)',
							'border-radius': 'var(--c15t-radius-md)',
							display: 'grid',
							gap: '0.5rem',
							padding: '1rem',
							width: '28rem',
						}}
					>
						Current tab: {value()}
					</div>
				</Show>
				<Show when={value() === 'vendors'}>
					<div
						class={classes.content()}
						role="tabpanel"
						style={{
							border: '1px solid var(--c15t-border)',
							'border-radius': 'var(--c15t-radius-md)',
							display: 'grid',
							gap: '0.5rem',
							padding: '1rem',
							width: '28rem',
						}}
					>
						Current tab: {value()}
					</div>
				</Show>
			</div>
		);
	},
};
