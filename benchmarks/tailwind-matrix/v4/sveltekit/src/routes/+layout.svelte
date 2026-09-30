<script lang="ts">
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentManagerProvider,
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

<ConsentManagerProvider
	{mode}
	persistence={false}
>
	{@render children()}
	<!-- #region docs:slot -->
	<ConsentBanner class="p-[7px] dark:p-[11px]" />
	<!-- #endregion docs:slot -->
	<ConsentDialog />
</ConsentManagerProvider>
