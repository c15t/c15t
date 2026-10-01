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
		footerStyle,
		footerSubGroupClassName,
		footerSubGroupStyle,
		footerTestId,
		footerSubGroupTestId,
		leading,
		renderAction,
	}: {
		actionGroups?: string[][];
		primaryActions?: string[];
		shouldFillActions?: boolean;
		direction?: SurfacePresentation['direction'];
		noStyle?: boolean;
		footerClassName?: string;
		/** `style` attribute for the footer, from its theme slot. */
		footerStyle?: string;
		footerSubGroupClassName?: string;
		/** `style` attribute for each action group, from its theme slot. */
		footerSubGroupStyle?: string;
		footerTestId?: string;
		footerSubGroupTestId?: string;
		/** Rendered inside the footer before the action groups, e.g. rights links. */
		leading?: Snippet;
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
	style={footerStyle}
	data-testid={footerTestId}
	data-direction={direction}
	data-fill={shouldFillActions ? true : undefined}
	data-split={isSplit && !shouldFillActions ? true : undefined}
>
	{@render leading?.()}
	{#each keyedActionGroups as actionGroup (actionGroup.key)}
		<div
			class={resolvedFooterSubGroupClassName}
			style={footerSubGroupStyle}
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
