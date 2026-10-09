<script lang="ts">
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentProvider,
		offline,
	} from '@c15t/svelte';

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
	<p
		class="bg-emerald-600 text-white"
		data-testid="tailwind-probe"
	>
		Tailwind utilities are active on this page.
	</p>
	<!-- #region docs:slot -->
	<ConsentBanner class="p-[7px] dark:p-[11px]" />
	<!-- #endregion docs:slot -->
	<ConsentDialog />
</ConsentProvider>
