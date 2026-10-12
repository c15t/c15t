<script setup lang="ts">
/**
 * Demo only: the assigned arm and the events logged under it. Renders
 * only when the plugin has an `experiment` (`?experiment=1`).
 */
import { useConsentConfig, useExperiment } from 'c15t/vue/vue-plugin';

import { experimentEvents } from './experiment';

const experimentConfigured = Boolean(useConsentConfig().value.experiment);
const experiment = useExperiment();
</script>

<template>
	<section
		v-if="experimentConfigured"
		class="card"
		data-testid="experiment"
	>
		<h2>Banner experiment</h2>
		<p>
			Arm:
			<code data-testid="experiment-arm">{{
				experiment
					? `${experiment.id} · ${experiment.arm} · ${experiment.assignedBy}`
					: 'assigning…'
			}}</code>
		</p>
		<ul class="statuses">
			<li
				v-for="(event, index) in experimentEvents"
				:key="index"
			>
				<code>{{ event.name }}</code> · {{ event.arm }} · {{ event.detail }}
			</li>
		</ul>
		<p>The same events are pushed to <code>window.dataLayer</code>.</p>
	</section>
</template>
