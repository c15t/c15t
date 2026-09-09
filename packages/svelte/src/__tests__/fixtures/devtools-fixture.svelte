<script lang="ts">
	import { resolvePolicyRules } from '@c15t/schema/types';

	import ConsentManagerProvider from '../../lib/components/consent-manager-provider.svelte';
	import ConsentDevToolsComponent from '../../lib/devtools';
	import { offline } from '../../lib/transports/offline';

	let {
		categories,
		clearRecords,
		getPresentation,
		presentation,
		storageKey,
		getConsentCategories,
		multiple = false,
		policyCategories,
		position = 'top-left',
	}: {
		categories?: import('@c15t/core').AllConsentNames[];
		clearRecords?: import('../../lib/devtools-options').ConsentDevToolsProps['clearRecords'];
		getPresentation?: import('../../lib/devtools-options').ConsentDevToolsProps['getPresentation'];
		presentation?: import('@c15t/core').ConsentPresentation;
		storageKey?: string;
		getConsentCategories?: import('../../lib/devtools-options').ConsentDevToolsProps['getConsentCategories'];
		multiple?: boolean;
		policyCategories?: import('@c15t/core').AllConsentNames[];
		position?: import('../../lib/devtools-options').ConsentDevToolsProps['position'];
	} = $props();
	const resolution = $derived.by(() => {
		if (!policyCategories) {
			return undefined;
		}
		const resolved = resolvePolicyRules({
			countryCode: null,
			regionCode: null,
			rules: [
				{
					categories: policyCategories,
					id: 'devtools-fixture',
					match: { isDefault: true },
					model: 'opt-in',
					prompt: 'choice',
				},
			],
		});
		if (resolved.status !== 'matched') {
			throw new Error('Devtools fixture policy must resolve');
		}
		return resolved;
	});
</script>

<ConsentManagerProvider
	options={{
		mode: offline(),
		consentCategories: categories,
		presentation,
		storageConfig: storageKey ? { storageKey } : undefined,
		prefetch: resolution ? { initialPolicyResolution: resolution } : undefined,
	}}
>
	<ConsentDevToolsComponent
		{clearRecords}
		{getPresentation}
		{position}
		{getConsentCategories}
		defaultOpen
	/>
</ConsentManagerProvider>

{#if multiple}
	<ConsentManagerProvider options={{ mode: offline() }}>
		<ConsentDevToolsComponent position="bottom-right" />
	</ConsentManagerProvider>
{/if}
