<script lang="ts">
let {
	title = 'Consent',
	titleId = 'consent-icon',
	class: className,
	...restProps
}: {
	title?: string;
	titleId?: string;
	class?: string;
	[key: string]: unknown;
} = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 140 97"
	fill="none"
	aria-labelledby={titleId}
	class={className}
	{...restProps}
>
	<title id={titleId}>{title}</title>
	<path
		fill="currentColor"
		fill-rule="evenodd"
		d="M53.179 70.787c6.17 0 11.172-5.002 11.172-11.172 0-4.009-2.111-7.524-5.283-9.495a23.87 23.87 0 0 1 8.817-1.677c13.217 0 23.93 10.714 23.93 23.93s-10.713 23.93-23.93 23.93c-13.216 0-23.93-10.714-23.93-23.93 0-1.924.227-3.795.656-5.588a11.148 11.148 0 0 0 8.568 4.002Z"
		clip-rule="evenodd"
	/>
	<path
		fill="currentColor"
		fill-rule="evenodd"
		d="M.618 74.716a68.453 68.453 0 0 1-.098-3.654c0-37.205 30.16-67.365 67.365-67.365s67.365 30.16 67.365 67.365c0 1.226-.032 2.444-.097 3.654h-21.927c.041-.776.061-1.557.061-2.343 0-24.531-19.887-44.418-44.418-44.418-24.532 0-44.418 19.887-44.418 44.418 0 .786.02 1.567.06 2.343H.618Z"
		clip-rule="evenodd"
	/>
</svg>
