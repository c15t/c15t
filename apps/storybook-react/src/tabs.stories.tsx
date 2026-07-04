import {
	arrowLeftNavigation,
	homeAndEndKeys,
	keyboardNavigation,
	tabKeySkipsInactiveTabs,
	tabSwitching,
} from '@c15t/conformance/play/tabs';
import { Tabs } from '@c15t/react/primitives';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type React from 'react';
import { useState } from 'react';

const meta = {
	component: Tabs.Root,
	parameters: {
		layout: 'centered',
	},
	title: 'PRIMITIVES - REACT/Tabs',
} satisfies Meta<typeof Tabs.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

const panelStyle: React.CSSProperties = {
	border: '1px solid var(--c15t-border)',
	borderRadius: 'var(--c15t-radius-md)',
	display: 'grid',
	gap: '0.5rem',
	padding: '1rem',
	width: '28rem',
};

export const Default: Story = {
	play: tabSwitching,
	render: () => (
		<Tabs.Root defaultValue="overview">
			<Tabs.List>
				<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
				<Tabs.Trigger value="vendors">Vendors</Tabs.Trigger>
				<Tabs.Trigger value="storage">Storage</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content style={panelStyle} value="overview">
				<strong>Overview</strong>
				<p style={{ margin: 0 }}>
					Use tabs for grouped content that shares a single disclosure region.
				</p>
			</Tabs.Content>
			<Tabs.Content style={panelStyle} value="vendors">
				<strong>Vendors</strong>
				<p style={{ margin: 0 }}>
					The IAB dialog uses this pattern for purposes and vendor disclosures.
				</p>
			</Tabs.Content>
			<Tabs.Content style={panelStyle} value="storage">
				<strong>Storage</strong>
				<p style={{ margin: 0 }}>
					Keyboard navigation supports arrow keys, Home, and End.
				</p>
			</Tabs.Content>
		</Tabs.Root>
	),
};

export const KeyboardNavigation: Story = {
	play: keyboardNavigation,
	render: () => (
		<Tabs.Root defaultValue="overview">
			<Tabs.List>
				<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
				<Tabs.Trigger value="vendors">Vendors</Tabs.Trigger>
				<Tabs.Trigger value="storage">Storage</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content style={panelStyle} value="overview">
				<strong>Overview</strong>
			</Tabs.Content>
			<Tabs.Content style={panelStyle} value="vendors">
				<strong>Vendors</strong>
			</Tabs.Content>
			<Tabs.Content style={panelStyle} value="storage">
				<strong>Storage</strong>
			</Tabs.Content>
		</Tabs.Root>
	),
};

export const ArrowLeftNavigation: Story = {
	play: arrowLeftNavigation,
	render: () => (
		<Tabs.Root defaultValue="overview">
			<Tabs.List>
				<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
				<Tabs.Trigger value="vendors">Vendors</Tabs.Trigger>
				<Tabs.Trigger value="storage">Storage</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content style={panelStyle} value="overview">
				<strong>Overview</strong>
			</Tabs.Content>
			<Tabs.Content style={panelStyle} value="vendors">
				<strong>Vendors</strong>
			</Tabs.Content>
			<Tabs.Content style={panelStyle} value="storage">
				<strong>Storage</strong>
			</Tabs.Content>
		</Tabs.Root>
	),
};

export const HomeAndEndKeys: Story = {
	play: homeAndEndKeys,
	render: () => (
		<Tabs.Root defaultValue="overview">
			<Tabs.List>
				<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
				<Tabs.Trigger value="vendors">Vendors</Tabs.Trigger>
				<Tabs.Trigger value="storage">Storage</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content style={panelStyle} value="overview">
				<strong>Overview</strong>
			</Tabs.Content>
			<Tabs.Content style={panelStyle} value="vendors">
				<strong>Vendors</strong>
			</Tabs.Content>
			<Tabs.Content style={panelStyle} value="storage">
				<strong>Storage</strong>
			</Tabs.Content>
		</Tabs.Root>
	),
};

export const TabKeySkipsInactiveTabs: Story = {
	play: tabKeySkipsInactiveTabs,
	render: () => (
		<Tabs.Root defaultValue="overview">
			<Tabs.List>
				<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
				<Tabs.Trigger value="vendors">Vendors</Tabs.Trigger>
				<Tabs.Trigger value="storage">Storage</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content style={panelStyle} value="overview">
				<strong>Overview</strong>
			</Tabs.Content>
			<Tabs.Content style={panelStyle} value="vendors">
				<strong>Vendors</strong>
			</Tabs.Content>
			<Tabs.Content style={panelStyle} value="storage">
				<strong>Storage</strong>
			</Tabs.Content>
		</Tabs.Root>
	),
};

export const Controlled: Story = {
	render: () => {
		const Demo = () => {
			const [value, setValue] = useState('vendors');
			return (
				<Tabs.Root onValueChange={setValue} value={value}>
					<Tabs.List>
						<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
						<Tabs.Trigger value="vendors">Vendors</Tabs.Trigger>
					</Tabs.List>
					<Tabs.Content style={panelStyle} value="overview">
						Current tab: {value}
					</Tabs.Content>
					<Tabs.Content style={panelStyle} value="vendors">
						Current tab: {value}
					</Tabs.Content>
				</Tabs.Root>
			);
		};

		return <Demo />;
	},
};
