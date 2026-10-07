<script lang="ts">
	import type { CornerPosition } from '@c15t/ui/utils';

	import ConsentManagerProvider from '../../lib/components/manager-provider.svelte';
	import ConsentDialogTrigger from '../../lib/components/panel-trigger.svelte';
	import ConsentDevToolsComponent from '../../lib/devtools';
	import { testOffline } from '../test-offline';

	let {
		devTools = true,
		trigger = true,
		showWhen = 'always',
		defaultPosition = 'bottom-right',
	}: {
		devTools?: boolean;
		trigger?: boolean;
		showWhen?: 'always' | 'never';
		defaultPosition?: CornerPosition;
	} = $props();
</script>

<ConsentManagerProvider options={{ mode: testOffline() }}>
	{#if devTools}
		<ConsentDevToolsComponent />
	{/if}
	{#if trigger}
		<ConsentDialogTrigger
			{defaultPosition}
			{showWhen}
			persistPosition={false}
		/>
	{/if}
</ConsentManagerProvider>
