<script lang="ts">
	import type { TabsOrientation } from '@c15t/ui/primitives';
	import { getDataDisabled } from '@c15t/ui/primitives';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { setTabsRootContext } from './context';

	const componentId = $props.id();

	let {
		children,
		class: className,
		disabled = false,
		loop = true,
		orientation = 'horizontal',
		value = $bindable<string | null>(null),
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		children?: Snippet;
		class?: string;
		disabled?: boolean;
		loop?: boolean;
		orientation?: TabsOrientation;
		value?: string | null;
	} = $props();

	const baseId = `c15t-tabs-${componentId}`;
	const dataDisabled = $derived(getDataDisabled(disabled));

	function setValue(nextValue: string) {
		if (disabled) {
			return;
		}

		value = nextValue;
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
