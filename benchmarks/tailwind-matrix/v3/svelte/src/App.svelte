<script lang="ts">
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentManagerProvider,
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

<!-- Tailwind 3 builds c15t's stylesheet from app.css. -->
<ConsentManagerProvider
	{mode}
	persistence={false}
	styles={false}
>
	<p
		class="bg-emerald-600 text-white"
		data-testid="tailwind-probe"
	>
		Tailwind utilities are active on this page.
	</p>
	<!-- #region docs:slot -->
	<ConsentBanner class="!p-[7px] dark:!p-[11px]" />
	<!-- #endregion docs:slot -->
	<ConsentDialog />
</ConsentManagerProvider>
