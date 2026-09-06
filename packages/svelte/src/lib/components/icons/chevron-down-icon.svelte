<script lang="ts">
	let {
		class: className,
		expanded = false,
		'aria-hidden': ariaHidden,
		...rest
	}: {
		class?: string;
		/** Point the chevron up instead of down. */
		expanded?: boolean;
		'aria-hidden'?: boolean;
		[key: string]: unknown;
	} = $props();
</script>

<svg
	class={className}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	aria-hidden={ariaHidden}
	{...rest}
>
	{#if expanded}
		<path d="M19 15l-7-7-7 7" />
	{:else}
		<path d="M19 9l-7 7-7-7" />
	{/if}
</svg>
