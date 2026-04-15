<script lang="ts">
	import { untrack } from 'svelte';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getDataDisabled, getSwitchState, toggleSwitchValue } from '@c15t/ui/primitives';
	import { setSwitchRootContext } from './context';

	let {
		children,
		class: className,
		checked: checkedProp,
		defaultChecked = false,
		disabled = false,
		onCheckedChange,
		type = 'button',
		...restProps
	}: HTMLAttributes<HTMLButtonElement> & {
		children?: Snippet;
		class?: string;
		checked?: boolean;
		defaultChecked?: boolean;
		disabled?: boolean;
		onCheckedChange?: (details: { checked: boolean }) => void;
		type?: 'button' | 'submit' | 'reset';
	} = $props();

	let internalChecked = $state(untrack(() => defaultChecked));

	const checked = $derived(checkedProp ?? internalChecked);
	const dataState = $derived(getSwitchState(checked));
	const dataDisabled = $derived(getDataDisabled(disabled));

	function setChecked(nextChecked: boolean) {
		if (disabled) {
			return;
		}

		if (checkedProp === undefined) {
			internalChecked = nextChecked;
		}

		onCheckedChange?.({ checked: nextChecked });
	}

	function toggle() {
		setChecked(toggleSwitchValue(checked));
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			toggle();
		}
	}

	setSwitchRootContext({
		get checked() {
			return checked;
		},
		get disabled() {
			return disabled;
		},
		toggle,
	});
</script>

<button
	type={type}
	role="switch"
	aria-checked={checked}
	class={className}
	data-slot="switch"
	data-state={dataState}
	data-disabled={dataDisabled}
	disabled={disabled}
	onclick={toggle}
	onkeydown={handleKeyDown}
	{...restProps}
>
	{@render children?.()}
</button>
