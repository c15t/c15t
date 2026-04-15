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
</script>

<div class={resolvedFooterClassName} data-testid={footerTestId}>
	{#each actionGroups as group, groupIndex (`${group.join('-')}-${groupIndex}`)}
		<div
			class={resolvedFooterSubGroupClassName}
			data-testid={footerSubGroupTestId}
		>
			{#each group as action (`${groupIndex}-${action}`)}
				{@render renderAction?.(
					action,
					primaryActions.includes(action),
					actionClassName
				)}
			{/each}
		</div>
	{/each}
</div>
