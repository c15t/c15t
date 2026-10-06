<script lang="ts">
	import { getConsentManager } from '@c15t/svelte';

	import { experimentEvents } from './experiment.svelte';

	const consent = getConsentManager();
</script>

<section data-testid="experiment">
	<h2>Banner experiment</h2>
	<p>
		Arm: <code data-testid="experiment-arm"
			>{consent.experiment
				? `${consent.experiment.id} · ${consent.experiment.arm} · ${consent.experiment.assignedBy}`
				: 'assigning…'}</code
		>
	</p>
	<ul>
		{#each experimentEvents as event, index (index)}
			<li>
				<code>{event.name}</code> · {event.arm} · {event.detail}
			</li>
		{/each}
	</ul>
	<p>The same events are pushed to <code>window.dataLayer</code>.</p>
</section>
