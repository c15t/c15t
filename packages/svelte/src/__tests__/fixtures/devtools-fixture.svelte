<script lang="ts">
	import { offline } from '@c15t/core';
	import { resolvePolicyRules } from '@c15t/schema/types';

	import ConsentProvider from '../../lib/components/consent-provider.svelte';
	import ConsentDevToolsComponent from '../../lib/devtools';

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
		shadow,
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
		shadow?: boolean;
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
					scopeMode: 'permissive',
				},
			],
		});
		if (resolved.status !== 'matched') {
			throw new Error('Devtools fixture policy must resolve');
		}
		return resolved;
	});
</script>

<ConsentProvider
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
		{shadow}
		defaultOpen
	/>
</ConsentProvider>

{#if multiple}
	<ConsentProvider options={{ mode: offline() }}>
		<ConsentDevToolsComponent position="bottom-right" />
	</ConsentProvider>
{/if}
