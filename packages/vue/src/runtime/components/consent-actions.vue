<script setup lang="ts" generic="T extends string">
import actionStyles from '@c15t/ui/styles/components/consent-actions';
import type { ButtonSize } from '@c15t/ui/styles/primitives';
import { computed } from 'vue';

import ConsentButton from './consent-button.vue';

type ConsentActionsDirection = 'row' | 'column';
type ConsentActionsProfile = 'compact' | 'balanced' | 'strict';
type ActionGroup = T | T[];

const props = withDefaults(
	defineProps<{
		actions?: T[];
		actionGroups?: T[][];
		layout?: ActionGroup[];
		direction?: ConsentActionsDirection;
		uiProfile?: ConsentActionsProfile;
		primaryActions?: T[];
		labels?: Partial<Record<T, string>>;
		testIds?: Partial<Record<T, string>>;
		rootAttrs?: object;
		groupAttrs?: object;
		/**
		 * Test id for the action root. A surface whose footer *is* the
		 * action root — every c15t consent surface — names it after the
		 * footer, so the slot means the same element it does in React.
		 */
		rootTestId?: string;
		/** Test id for each action group. */
		groupTestId?: string;
		/** Extra classes for the action root, e.g. the surface's footer. */
		rootClass?: string;
		size?: ButtonSize;
		disabled?: boolean;
		primaryMode?: 'stroke' | 'filled';
		secondaryMode?: 'stroke' | 'filled';
		fill?: boolean;
	}>(),
	{
		direction: 'row',
		primaryMode: 'stroke',
		rootTestId: 'consent-actions',
		secondaryMode: 'stroke',
		size: 'small',
		uiProfile: 'compact',
	}
);

const emit = defineEmits<{
	action: [action: T];
}>();

const actionGroups = computed<T[][]>(() => {
	if (props.actionGroups && props.actionGroups.length > 0) {
		return props.actionGroups;
	}
	if (props.layout && props.layout.length > 0) {
		return props.layout.map((group) =>
			Array.isArray(group) ? group : [group]
		);
	}
	if (props.actions && props.actions.length > 0) {
		return [props.actions];
	}
	return [];
});

const resolvedDirection = computed<ConsentActionsDirection>(() =>
	props.direction === 'column' ? 'column' : 'row'
);

const isSplitLayout = computed(() => actionGroups.value.length > 1);

const shouldFill = computed(() => {
	if (typeof props.fill === 'boolean') {
		return props.fill;
	}
	const groups = actionGroups.value;
	const actionCount = new Set(groups.flat()).size;
	const isColumn = resolvedDirection.value === 'column';

	if (props.uiProfile === 'strict') {
		return true;
	}
	if (props.uiProfile === 'balanced' && actionCount <= 2) {
		return true;
	}
	if (
		props.uiProfile === 'balanced' &&
		actionCount === 3 &&
		(isSplitLayout.value || isColumn)
	) {
		return true;
	}
	return false;
});

const isPrimary = function isPrimary(action: T) {
	if (props.primaryActions && props.primaryActions.length > 0) {
		return props.primaryActions.includes(action);
	}
	return (
		actionGroups.value.flat().includes('customize' as T) &&
		action === ('customize' as T)
	);
};

const actionLabel = function actionLabel(action: T) {
	return props.labels?.[action] ?? String(action);
};

const actionTestId = function actionTestId(action: T) {
	return props.testIds?.[action] ?? `consent-actions-${action}-button`;
};

const buttonMode = function buttonMode(action: T) {
	if (isPrimary(action)) {
		return props.primaryMode;
	}
	return props.secondaryMode;
};
</script>

<template>
	<div
		v-bind="rootAttrs"
		:data-testid="rootTestId"
		:class="[actionStyles.actionRoot, rootClass]"
		:data-direction="resolvedDirection"
		:data-fill="shouldFill ? true : undefined"
		:data-split="isSplitLayout && !shouldFill ? true : undefined"
	>
		<div
			v-for="(group, groupIndex) in actionGroups"
			:key="`group-${group.join('-') || groupIndex}`"
			v-bind="groupAttrs"
			:data-testid="groupTestId"
			:class="actionStyles.actionGroup"
			:data-direction="resolvedDirection"
			:data-fill="shouldFill ? true : undefined"
		>
			<ConsentButton
				v-for="action in group"
				:key="action"
				:variant="isPrimary(action) ? 'primary' : 'neutral'"
				:mode="buttonMode(action)"
				:size="size"
				:disabled="disabled"
				:data-action="action"
				:data-testid="actionTestId(action)"
				@click="emit('action', action)"
			>
				{{ actionLabel(action) }}
			</ConsentButton>
		</div>
	</div>
</template>
