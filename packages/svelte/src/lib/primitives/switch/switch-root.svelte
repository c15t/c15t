<script lang="ts">
	import { getDataDisabled, getSwitchState, toggleSwitchValue } from '@c15t/ui/primitives';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { setSwitchRootContext } from './context';

	let {
		children,
		class: className,
		checked = $bindable(false),
		disabled = false,
		onclick,
		onkeydown,
		type = 'button',
		...restProps
	}: HTMLAttributes<HTMLButtonElement> & {
		children?: Snippet;
		class?: string;
		checked?: boolean;
		disabled?: boolean;
		type?: 'button' | 'submit' | 'reset';
	} = $props();

	const dataState = $derived(getSwitchState(checked));
	const dataDisabled = $derived(getDataDisabled(disabled));

	function setChecked(nextChecked: boolean) {
		if (disabled) {
			return;
		}

		checked = nextChecked;
	}

	function toggle() {
		setChecked(toggleSwitchValue(checked));
	}

	function handleClick(
		event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }
	) {
		toggle();
		onclick?.(event);
	}

	function handleKeyDown(
		event: KeyboardEvent & { currentTarget: EventTarget & HTMLButtonElement }
	) {
		if (event.key === 'Enter') {
			event.preventDefault();
			toggle();
		}
		onkeydown?.(event);
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
	{...restProps}
	onclick={handleClick}
	onkeydown={handleKeyDown}
>
	{@render children?.()}
</button>
