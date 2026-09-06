<script setup lang="ts">
import type { ButtonMode, ButtonVariant } from '@c15t/schema/config';
import buttonStyles from '@c15t/ui/styles/components/button';
import type { ButtonSize } from '@c15t/ui/styles/primitives';
import { computed, mergeProps } from 'vue';

import { useConsentConfig } from '../composables/config';

const props = withDefaults(
	defineProps<{
		variant?: ButtonVariant;
		mode?: ButtonMode;
		size?: ButtonSize;
		type?: 'button' | 'submit' | 'reset';
	}>(),
	{
		mode: 'filled',
		// Matches the React primitive's default, so a consent surface sizes
		// its controls the same way in both.
		size: 'small',
		type: 'button',
		variant: 'primary',
	}
);

const config = useConsentConfig();
const buttonAttrs = computed(() =>
	mergeProps(
		{
			'data-mode': props.mode,
			'data-size': props.size,
			'data-testid': 'consent-button',
			'data-variant': props.variant,
			type: props.type,
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
