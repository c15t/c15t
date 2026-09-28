<script lang="ts">
	import type { ConsentKernel, ConsentPresentation } from '@c15t/core';
	import { untrack } from 'svelte';

	import ConsentGate from '../../lib/components/consent-gate.svelte';
	import Provider from '../../lib/components/manager-provider.svelte';
	import ConsentDialogLink from '../../lib/components/panel-link.svelte';
	import ConsentDialogTrigger from '../../lib/components/panel-trigger.svelte';
	import ConsentDialog from '../../lib/components/panel.svelte';
	import ConsentBanner from '../../lib/components/prompt.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';
	import Capture from './conformance-kernel-capture.svelte';

	let {
		options,
		onKernel = () => {
			// Server rendering does not capture the client runtime.
		},
		probeGates = false,
		onPresentation = () => {
			// Server rendering does not capture the client runtime.
		},
	}: {
		options: ConsentManagerOptions;
		onKernel?: (kernel: ConsentKernel) => void;
		probeGates?: boolean;
		onPresentation?: (update: (value: ConsentPresentation) => void) => void;
	} = $props();
	let presentation = $state(untrack(() => options.presentation));
	untrack(() =>
		onPresentation((value) => {
			presentation = value;
		})
	);
</script>

<Provider options={{ ...options, presentation }}>
	<Capture {onKernel} />
	<!-- Attribution changes after mount; policy SSR checks compare the prompt. -->
	<ConsentBanner hideBranding />
	<ConsentDialog />
	<ConsentDialogTrigger />
	<ConsentDialogLink>Privacy settings</ConsentDialogLink>
	{#if probeGates}
		<ConsentGate category="marketing">
			{#snippet placeholder()}<div data-testid="policy-iframe-placeholder">
					Blocked frame
				</div>{/snippet}
			<iframe
				title="probe"
				sandbox=""
				src="about:blank#c15t-policy-probe"
				data-testid="policy-iframe"
			></iframe>
		</ConsentGate>
	{/if}
</Provider>
