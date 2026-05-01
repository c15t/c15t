<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { getSwitchRootContext } from './context';

	const root = getSwitchRootContext();

	const checked = $derived(root.checked);
	const disabled = $derived(root.disabled);

	let {
		name,
		value = 'on',
		...restProps
	}: HTMLAttributes<HTMLInputElement> & {
		name?: string;
		value?: string;
	} = $props();
</script>

<input
	type="checkbox"
	{name}
	{value}
	checked={checked}
	disabled={disabled}
	tabindex={-1}
	aria-hidden="true"
	style="position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap;"
	{...restProps}
/>
