<script lang="ts">
let {
	class: className,
	width,
	height,
	'aria-hidden': ariaHidden,
	...rest
}: {
	class?: string;
	width?: string;
	height?: string;
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
	<path d="M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
</svg>
