<script lang="ts">
	import { getConsentManager } from '@c15t/svelte/headless';

	import { experimentEvents } from './experiment.svelte';

	const consent = getConsentManager();
</script>

<section data-testid="experiment">
	<h2>Banner experiment</h2>
	<p>
		Arm: <code data-testid="experiment-arm"
			>{consent.experiment
				? `${consent.experiment.id} · ${consent.experiment.variant} · ${consent.experiment.assignedBy}`
				: 'assigning…'}</code
		>
	</p>
	<ul>
		{#each experimentEvents as event, index (index)}
			<li>
				<code>{event.name}</code> · {event.variant} · {event.surface}
				{#if event.name === 'c15t_choice_recorded'}
					· {event.consentAction}
				{/if}
				{#if event.name !== 'c15t_surface_shown' && event.timeToDecisionMs !== undefined}
					· {event.timeToDecisionMs} ms
				{/if}
			</li>
		{/each}
	</ul>
	<p>The same events are pushed to <code>window.dataLayer</code>.</p>
</section>
