<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getDataDisabled, getNextTabValue, getTabState } from '@c15t/ui/primitives';
	import { getTabsRootContext } from './context';

	const root = getTabsRootContext();

	let {
		children,
		class: className,
		type = 'button',
		value,
		...restProps
	}: HTMLAttributes<HTMLButtonElement> & {
		children?: Snippet;
		class?: string;
		type?: 'button' | 'submit' | 'reset';
		value: string;
	} = $props();

	const baseId = $derived(root.baseId);
	const disabled = $derived(root.disabled);
	const selectedValue = $derived(root.value);
	const isSelected = $derived(selectedValue === value);
	const dataState = $derived(getTabState(isSelected));
	const dataDisabled = $derived(getDataDisabled(disabled));
	const triggerId = $derived(`${baseId}-trigger-${value}`);
	const contentId = $derived(`${baseId}-content-${value}`);

	function moveFocus(nextValue: string) {
		root.setValue(nextValue);

		if (typeof document === 'undefined') {
			return;
		}

		const nextButton = document.getElementById(
			`${baseId}-trigger-${nextValue}`
		);

		if (nextButton instanceof HTMLButtonElement) {
			nextButton.focus();
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (typeof document === 'undefined') {
			return;
		}

		const triggerValues = Array.from(
			document.querySelectorAll<HTMLButtonElement>(
				`[data-c15t-tabs-base="${baseId}"] [data-slot="tabs-trigger"]`
			)
		).map((button) => button.id.replace(`${baseId}-trigger-`, ''));

		const nextValue = getNextTabValue({
			currentValue: value,
			key: event.key,
			loop: root.loop,
			orientation: root.orientation,
			triggerValues,
		});

		if (nextValue !== value || event.key === 'Home' || event.key === 'End') {
			event.preventDefault();
			moveFocus(nextValue);
		}
	}
</script>

<button
	type={type}
	id={triggerId}
	role="tab"
	tabindex={isSelected ? 0 : -1}
	aria-controls={contentId}
	aria-selected={isSelected}
	class={className}
	data-slot="tabs-trigger"
	data-state={dataState}
	data-disabled={dataDisabled}
	disabled={disabled}
	onclick={() => root.setValue(value)}
	onkeydown={handleKeyDown}
	{...restProps}
>
	{@render children?.()}
</button>
