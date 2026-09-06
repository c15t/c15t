<script setup lang="ts">
import switchStyles from '@c15t/ui/styles/components/switch';

import { useConsentConfig } from '#c15t/composables';

import { SwitchRoot, SwitchThumb } from '../primitives';

withDefaults(
	defineProps<{
		disabled?: boolean;
		ariaLabel?: string;
		indeterminate?: boolean;
		size?: 'small' | 'medium';
		/**
		 * The switch's test id. `null` renders none, which is what the IAB
		 * rows need: React's and Svelte's switches inside a purpose row are
		 * unlabelled, so a stray `consent-switch` there is drift.
		 */
		testId?: string | null;
	}>(),
	{
		size: 'medium',
		testId: 'consent-switch',
	}
);

const model = defineModel<boolean>({ default: false });

const config = useConsentConfig();
</script>

<template>
	<SwitchRoot
		v-model="model"
		v-bind="config.components?.switch?.root"
		:disabled="disabled"
		:aria-label="ariaLabel"
		:data-indeterminate="indeterminate ? true : undefined"
		:data-size="size === 'small' ? 'small' : undefined"
		:data-testid="testId ?? undefined"
		:class="switchStyles.root"
	>
		<span
			v-bind="config.components?.switch?.track"
			data-slot="switch-track"
			:class="switchStyles.track"
		>
			<SwitchThumb
				v-bind="config.components?.switch?.thumb"
				:class="switchStyles.thumb"
			/>
		</span>
	</SwitchRoot>
</template>
