<script lang="ts">
import type { PolicyUiActionDirection } from 'c15t';
import type { Snippet } from 'svelte';

let {
	actionGroups = [],
	primaryActions = [],
	shouldFillActions = false,
	direction = 'row',
	footerClassName,
	footerFillClassName,
	footerColumnClassName,
	footerSubGroupClassName,
	footerSubGroupFillClassName,
	footerSubGroupColumnClassName,
	actionButtonFillClassName,
	footerTestId,
	footerSubGroupTestId,
	renderAction,
}: {
	actionGroups?: string[][];
	primaryActions?: string[];
	shouldFillActions?: boolean;
	direction?: PolicyUiActionDirection;
	footerClassName?: string;
	footerFillClassName?: string;
	footerColumnClassName?: string;
	footerSubGroupClassName?: string;
	footerSubGroupFillClassName?: string;
	footerSubGroupColumnClassName?: string;
	actionButtonFillClassName?: string;
	footerTestId?: string;
	footerSubGroupTestId?: string;
	renderAction?: Snippet<[string, boolean, string | undefined]>;
} = $props();

const isColumn = $derived(direction === 'column');
const resolvedFooterClassName = $derived(
	[
		footerClassName,
		shouldFillActions ? footerFillClassName : '',
		isColumn ? footerColumnClassName : '',
	]
		.filter(Boolean)
		.join(' ')
);
const resolvedFooterSubGroupClassName = $derived(
	[
		footerSubGroupClassName,
		shouldFillActions ? footerSubGroupFillClassName : '',
		isColumn ? footerSubGroupColumnClassName : '',
	]
		.filter(Boolean)
		.join(' ')
);
const actionClassName = $derived(
	shouldFillActions ? actionButtonFillClassName : undefined
);
const keyedActionGroups = $derived(
	actionGroups.map((group, groupIndex) => ({
		group,
		groupIndex,
		key: group.join('-') + '-' + groupIndex,
	}))
);
</script>

<div class={resolvedFooterClassName} data-testid={footerTestId}>
	{#each keyedActionGroups as actionGroup (actionGroup.key)}
		<div
			class={resolvedFooterSubGroupClassName}
			data-testid={footerSubGroupTestId}
		>
			{#each actionGroup.group as action (actionGroup.groupIndex + '-' + action)}
				{@render renderAction?.(
					action,
					primaryActions.includes(action),
					actionClassName
				)}
			{/each}
		</div>
	{/each}
</div>
