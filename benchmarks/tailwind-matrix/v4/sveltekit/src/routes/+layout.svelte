<script lang="ts">
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentProvider,
		offline,
	} from '@c15t/svelte';

	import '../app.css';

	let { children } = $props();

	const mode = offline({
		policyRules: [
			{
				id: 'tailwind-matrix',
				match: { isDefault: true },
				model: 'opt-in',
				prompt: 'choice',
			},
		],
	});
</script>

<ConsentProvider
	{mode}
	persistence={false}
>
	{@render children()}
	<!-- #region docs:slot -->
	<ConsentBanner class="p-[7px] dark:p-[11px]" />
	<!-- #endregion docs:slot -->
	<ConsentDialog />
</ConsentProvider>
