<script lang="ts">
let {
	title = 'INTH',
	titleId = 'inth-logo',
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
	viewBox="0 0 88 90"
	fill="none"
	aria-labelledby={titleId}
	class={className}
	{...restProps}
>
	<title id={titleId}>{title}</title>
	<path
		fill="currentColor"
		d="M40.9164 0V8.26444H27.6933V26.7966H40.9164V35.0608H6.15594V26.7966H19.3788V8.26444H6.15594V0H40.9164Z"
	/>
	<path
		fill="currentColor"
		d="M72.1149 20.1264V0H80.0343V35.0608H74.2747L54.9798 14.8193V35.0608H47.0604V0H52.964L72.1149 20.1264Z"
	/>
	<path
		fill="currentColor"
		fill-rule="evenodd"
		clip-rule="evenodd"
		d="M71.36 41.6H88V89.6H0V41.6H61.12V31.04L71.36 41.6ZM6.15594 48.0891V56.4034H19.1784V83.2H27.4428V56.4034H40.5656V48.0891H6.15594ZM47.0603 48.1391V83.2H55.3247V70.2441H71.7531V83.2H80.0675V48.1391H71.7531V61.9797H55.3247V48.1391H47.0603Z"
	/>
</svg>
