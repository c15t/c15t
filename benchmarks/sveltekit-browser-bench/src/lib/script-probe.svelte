<script
	lang="ts"
	module
>
	/**
	 * Script-loading probe for the `scripts` arms. Records when the visitor
	 * accepted and, for a returning visitor, how long a request the network
	 * blocker gates was held. The stand-in third-party script records when
	 * it ran; the runner reads its request start from resource timing.
	 */

	/** The shape the runner reads out of the page. */
	export interface SvelteBenchScriptState {
		/** `performance.now()` when the accept button was clicked. */
		acceptClickMs?: number;
		/** From the gated `fetch()` call until its request started. */
		heldRequestMs?: number;
	}

	declare global {
		interface Window {
			__c15tSvelteBenchScripts?: SvelteBenchScriptState;
			__c15tBenchScriptExecutedMs?: number;
		}
	}
</script>

<script lang="ts">
	import { benchBeaconURL } from '$lib/fixture';
	import { onMount } from 'svelte';

	let { returning }: { returning: boolean } = $props();

	const state: SvelteBenchScriptState = {};

	const recordAccept = function recordAccept(event: MouseEvent): void {
		if (
			event.target instanceof Element &&
			event.target.closest('[data-testid="consent-banner-accept-button"]')
		) {
			state.acceptClickMs ??= performance.now();
		}
	};

	/**
	 * Sent before the provider starts, as a page's own analytics call
	 * would be: the runtime holds it until the network blocker has loaded
	 * and decided it.
	 */
	const sendGatedRequest = async function sendGatedRequest(): Promise<void> {
		const url = `${benchBeaconURL}?at=${Date.now()}`;
		const calledAt = performance.now();
		const response = await fetch(url, { cache: 'no-store' });
		// The resource timing entry lands once the body has.
		await response.text();
		const entry = performance
			.getEntriesByType('resource')
			.find((candidate) => candidate.name.endsWith(url));
		if (entry) {
			state.heldRequestMs = entry.startTime - calledAt;
		}
	};

	onMount(() => {
		window.__c15tSvelteBenchScripts = state;
		if (returning) {
			void sendGatedRequest();
		}
		document.addEventListener('click', recordAccept, true);
		return () => document.removeEventListener('click', recordAccept, true);
	});
</script>
