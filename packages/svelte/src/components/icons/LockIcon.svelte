<script lang="ts">
let {
	class: className,
	'aria-hidden': ariaHidden,
	...rest
}: {
	class?: string;
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
	<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
	<path d="M7 11V7a5 5 0 0 1 10 0v4" />
</svg>
