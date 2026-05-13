<script lang="ts">
import { Dialog, Switch, Tabs } from '../../lib/primitives';

let checked = $state(false);
let dialogOpen = $state(false);
let tab = $state<string | null>('one');
let switchClicks = $state(0);
let closeClicks = $state(0);
let tabClicks = $state(0);
</script>

<Switch.Root
	bind:checked
	aria-label="Telemetry"
	data-testid="switch"
	onclick={() => {
		switchClicks += 1;
	}}
>
	<Switch.Control>
		<Switch.Thumb />
	</Switch.Control>
</Switch.Root>
<div data-testid="checked-value">{String(checked)}</div>
<div data-testid="switch-clicks">{switchClicks}</div>

<Tabs.Root bind:value={tab}>
	<Tabs.List>
		<Tabs.Trigger value="one">One</Tabs.Trigger>
		<Tabs.Trigger
			value="two"
			data-testid="tab-two"
			onclick={() => {
				tabClicks += 1;
			}}
		>
			Two
		</Tabs.Trigger>
	</Tabs.List>
	<Tabs.Content value="one">Panel one</Tabs.Content>
	<Tabs.Content value="two">Panel two</Tabs.Content>
</Tabs.Root>
<div data-testid="tab-value">{tab}</div>
<div data-testid="tab-clicks">{tabClicks}</div>

<button
	type="button"
	data-testid="open-dialog"
	onclick={() => {
		dialogOpen = true;
	}}
>
	Open dialog
</button>
<Dialog.Root bind:open={dialogOpen} trapFocus={false}>
	<Dialog.Content>
		<Dialog.Title>Dialog title</Dialog.Title>
		<Dialog.CloseTrigger
			data-testid="close-dialog"
			onclick={() => {
				closeClicks += 1;
			}}
		>
			Close
		</Dialog.CloseTrigger>
	</Dialog.Content>
</Dialog.Root>
<div data-testid="dialog-open">{String(dialogOpen)}</div>
<div data-testid="close-clicks">{closeClicks}</div>
