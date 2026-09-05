<script lang="ts">
	import { createDevTools } from '@c15t/dev-tools';
	import { untrack } from 'svelte';

	import { getConsentContext } from '../context.svelte';
	import type { ConsentDevToolsProps } from '../devtools-options';

	let {
		clearRecords,
		getPresentation,
		defaultOpen,
		defaultTab,
		getConsentCategories,
		maxEvents,
		position,
	}: ConsentDevToolsProps = $props();
	const context = getConsentContext();
	// Snapshot updates can return a new array with the same categories. Only
	// recreate the inspector when the displayed scope actually changes.
	const categoryKey = $derived(
		JSON.stringify(
			[
				...new Set(getConsentCategories?.() ?? context.state.consentCategories),
			].sort()
		)
	);

	const viewKey = $derived(
		JSON.stringify({
			categoryKey,
			defaultOpen,
			defaultTab,
			maxEvents,
			position,
		})
	);

	$effect(() => {
		const { categoryKey: scopeKey, ...settings } = JSON.parse(viewKey) as Pick<
			ConsentDevToolsProps,
			'defaultOpen' | 'defaultTab' | 'maxEvents' | 'position'
		> & { categoryKey: string };
		const categories = JSON.parse(scopeKey) as ReturnType<
			NonNullable<ConsentDevToolsProps['getConsentCategories']>
		>;
		const options = {
			...settings,
			clearRecords: () => (clearRecords ?? context.clearRecords)(),
			getConsentCategories: () => categories,
			getPresentation: () =>
				getPresentation ? getPresentation() : context.state.presentation,
			kernel: context.kernel,
		};
		const devTools = untrack(() => createDevTools(options));

		return () => devTools.destroy();
	});
</script>
