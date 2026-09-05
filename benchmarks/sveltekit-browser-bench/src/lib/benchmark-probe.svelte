<script
	lang="ts"
	module
>
	import type { ConsentSnapshot } from '@c15t/svelte';

	export interface SvelteBenchState {
		scenario: string;
		activeUI: string;
		overrides: {
			country?: string;
			region?: string;
			language?: string;
			gpc?: boolean;
		};
		privacySignals: ConsentSnapshot['privacySignals'];
		location: {
			countryCode?: string | null;
			regionCode?: string | null;
		} | null;
		hasStoredChoice: boolean;
	}

	declare global {
		interface Window {
			__c15tSvelteBench?: SvelteBenchState;
		}
	}
</script>

<script lang="ts">
	import { getConsentKernel } from '@c15t/svelte';
	import { onMount } from 'svelte';

	let { scenario }: { scenario: string } = $props();

	const kernel = getConsentKernel();

	const publish = function publish(snapshot: ConsentSnapshot) {
		window.__c15tSvelteBench = {
			activeUI: snapshot.activeUI ?? 'none',
			hasStoredChoice: Boolean(snapshot.explicitChoice),
			location: snapshot.location
				? {
						countryCode: snapshot.location.countryCode,
						regionCode: snapshot.location.regionCode,
					}
				: null,
			overrides: { ...snapshot.overrides },
			privacySignals: snapshot.privacySignals,
			scenario,
		};
	};

	onMount(() => {
		publish(kernel.getSnapshot());
		return kernel.subscribe(publish);
	});
</script>
