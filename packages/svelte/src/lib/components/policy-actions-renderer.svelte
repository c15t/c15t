<script lang="ts">
	import type { SurfacePresentation } from '@c15t/core';
	import actionStyles from '@c15t/ui/styles/components/consent-actions';
	import type { Snippet } from 'svelte';

	/**
	 * Renders policy-driven action groups using the shared `consent-actions`
	 * contract: layout (fill, column, split) is expressed through data
	 * attributes that the component CSS reads, so every framework adapter
	 * produces the same DOM.
	 */
	let {
		actionGroups = [],
		primaryActions = [],
		shouldFillActions = false,
		direction = 'row',
		noStyle = false,
		footerClassName,
		footerSubGroupClassName,
		footerTestId,
		footerSubGroupTestId,
		renderAction,
	}: {
		actionGroups?: string[][];
		primaryActions?: string[];
		shouldFillActions?: boolean;
		direction?: SurfacePresentation['direction'];
		noStyle?: boolean;
		footerClassName?: string;
		footerSubGroupClassName?: string;
		footerTestId?: string;
		footerSubGroupTestId?: string;
		renderAction?: Snippet<[string, boolean]>;
	} = $props();

	const isSplit = $derived(actionGroups.length > 1);
	const resolvedFooterClassName = $derived(
		[noStyle ? '' : actionStyles.actionRoot, footerClassName]
			.filter(Boolean)
			.join(' ')
	);
	const resolvedFooterSubGroupClassName = $derived(
		[noStyle ? '' : actionStyles.actionGroup, footerSubGroupClassName]
			.filter(Boolean)
			.join(' ')
	);
	const keyedActionGroups = $derived(
		actionGroups.map((group, groupIndex) => ({
			group,
			groupIndex,
			key: `${group.join('-')}-${groupIndex}`,
		}))
	);
</script>

<div
	class={resolvedFooterClassName}
	data-testid={footerTestId}
	data-direction={direction}
	data-fill={shouldFillActions ? true : undefined}
	data-split={isSplit && !shouldFillActions ? true : undefined}
>
	{#each keyedActionGroups as actionGroup (actionGroup.key)}
		<div
			class={resolvedFooterSubGroupClassName}
			data-testid={footerSubGroupTestId}
			data-direction={direction}
			data-fill={shouldFillActions ? true : undefined}
		>
			{#each actionGroup.group as action (actionGroup.groupIndex + '-' + action)}
				{@render renderAction?.(action, primaryActions.includes(action))}
			{/each}
		</div>
	{/each}
</div>
