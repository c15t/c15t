<script setup lang="ts">
import type { ButtonMode, ButtonVariant } from '@c15t/schema/config';
import buttonStyles from '@c15t/ui/styles/v3/button';
import { computed, mergeProps } from 'vue';

import { useConsentConfig } from '../composables/config';

const props = withDefaults(
	defineProps<{
		variant?: ButtonVariant;
		mode?: ButtonMode;
		type?: 'button' | 'submit' | 'reset';
	}>(),
	{
		variant: 'primary',
		mode: 'filled',
		type: 'button',
	}
);

const config = useConsentConfig();
const buttonAttrs = computed(() =>
	mergeProps(
		{
			type: props.type,
			'data-testid': 'consent-button',
			'data-variant': props.variant,
			'data-mode': props.mode,
		},
		((props.variant === 'primary'
			? config.value.components?.button?.primary
			: config.value.components?.button?.secondary) ?? {}) as Record<
			string,
			unknown
		>
	)
);
</script>

<template>
	<button
		v-bind="buttonAttrs"
		:class="buttonStyles.button"
	>
		<slot />
	</button>
</template>
