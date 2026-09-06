<script lang="ts">
	let {
		class: className,
		width,
		height,
		expanded = false,
		'aria-hidden': ariaHidden,
		...rest
	}: {
		class?: string;
		width?: string;
		height?: string;
		/** Point the chevron down instead of right. */
		expanded?: boolean;
		'aria-hidden'?: boolean;
		[key: string]: unknown;
	} = $props();
</script>

<svg
	class={className}
	{width}
	{height}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	aria-hidden={ariaHidden}
	{...rest}
>
	{#if expanded}
		<path d="M19 9l-7 7-7-7" />
	{:else}
		<path d="M9 5l7 7-7 7" />
	{/if}
</svg>
