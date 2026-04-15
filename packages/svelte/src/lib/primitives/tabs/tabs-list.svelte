<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getDataDisabled } from '@c15t/ui/primitives';
	import { getTabsRootContext } from './context';

	const root = getTabsRootContext();

	const disabled = $derived(root.disabled);
	const rootOrientation = $derived(root.orientation);
	const dataDisabled = $derived(getDataDisabled(disabled));

	let {
		children,
		class: className,
		orientation: orientationProp,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		children?: Snippet;
		class?: string;
		orientation?: 'horizontal' | 'vertical';
	} = $props();

	const orientation = $derived(orientationProp ?? rootOrientation);
</script>

<div
	role="tablist"
	aria-orientation={orientation}
	class={className}
	data-slot="tabs-list"
	data-orientation={orientation}
	data-disabled={dataDisabled}
	{...restProps}
>
	{@render children?.()}
</div>
