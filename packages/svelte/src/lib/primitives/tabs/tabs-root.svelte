<script lang="ts">
	import { untrack } from 'svelte';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { TabsOrientation } from '@c15t/ui/primitives';
	import { getDataDisabled } from '@c15t/ui/primitives';
	import { setTabsRootContext } from './context';

	const componentId = $props.id();

	let {
		children,
		class: className,
		defaultValue = null,
		disabled = false,
		loop = true,
		onValueChange,
		orientation = 'horizontal',
		value: valueProp,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		children?: Snippet;
		class?: string;
		defaultValue?: string | null;
		disabled?: boolean;
		loop?: boolean;
		onValueChange?: (details: { value: string | null }) => void;
		orientation?: TabsOrientation;
		value?: string | null;
	} = $props();

	let internalValue = $state<string | null>(untrack(() => defaultValue));

	const value = $derived(valueProp ?? internalValue);
	const baseId = `c15t-tabs-${componentId}`;
	const dataDisabled = $derived(getDataDisabled(disabled));

	function setValue(nextValue: string) {
		if (disabled) {
			return;
		}

		if (valueProp === undefined) {
			internalValue = nextValue;
		}

		onValueChange?.({ value: nextValue });
	}

	setTabsRootContext({
		get baseId() {
			return baseId;
		},
		get disabled() {
			return disabled;
		},
		get loop() {
			return loop;
		},
		get orientation() {
			return orientation;
		},
		get value() {
			return value;
		},
		setValue,
	});
</script>

<div
	class={className}
	data-slot="tabs-root"
	data-orientation={orientation}
	data-disabled={dataDisabled}
	data-c15t-tabs-base={baseId}
	{...restProps}
>
	{@render children?.()}
</div>
