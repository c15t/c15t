import { resolveConsentPresentation } from '@c15t/core';
import type {
	ConsentSnapshot,
	ConsentPresentation,
	PromptPresentation,
	PresentationAction,
	ResolvedConsentPresentation,
} from '@c15t/core';

import { classes } from '../generated/styles';
import { cx, h } from './dom';

/** Resolve buttons and geometry with the same policy constraints as React. */
export const resolveActions = function resolveActions(
	snapshot: ConsentSnapshot,
	surface: 'prompt' | 'preferences',
	presentation?: ConsentPresentation,
	override?: PromptPresentation
): ResolvedConsentPresentation {
	return resolveConsentPresentation({
		override,
		policy: snapshot.policyRule,
		presentation,
		surface,
	});
};

/** What {@link renderActionFooter} needs. */
export interface ActionFooterParams {
	/** The resolved actions. */
	actions: ResolvedConsentPresentation;
	/** Extra class on the footer root (the surface's `footer`). */
	footerClassName: string;
	/** Ship the DOM without class names. */
	noStyle: boolean;
	/** Test id for the footer. */
	testId: string;
	/** Test id for each sub group. */
	subGroupTestId: string;
	/** Label for an action. */
	label: (action: PresentationAction) => string;
	/** Test id for an action's button. */
	buttonTestId: (action: PresentationAction) => string;
	/** Click handler. */
	onAction: (action: PresentationAction) => void;
}

/**
 * Render a surface's button footer.
 *
 * @param params - Actions, classes and handlers.
 * @returns The footer element.
 */
export const renderActionFooter = function renderActionFooter(
	params: ActionFooterParams
): HTMLElement {
	const { actions, noStyle } = params;
	const footer = h('div', {
		class: noStyle
			? ''
			: cx(classes.actions.actionRoot, params.footerClassName),
		'data-direction': actions.direction,
		'data-fill': actions.shouldFillActions ? 'true' : undefined,
		'data-split':
			actions.actionGroups.length > 1 && !actions.shouldFillActions
				? 'true'
				: undefined,
		'data-testid': params.testId,
	});
	for (const group of actions.actionGroups) {
		const groupElement = h('div', {
			class: noStyle ? '' : classes.actions.actionGroup,
			'data-direction': actions.direction,
			'data-fill': actions.shouldFillActions ? 'true' : undefined,
			'data-testid': params.subGroupTestId,
		});
		for (const action of group) {
			const variant = actions.primaryActions.includes(action)
				? 'primary'
				: 'neutral';
			groupElement.append(
				h(
					'button',
					{
						class: noStyle ? '' : classes.button.button,
						'data-action': action,
						'data-mode': noStyle ? undefined : 'stroke',
						'data-size': noStyle ? undefined : 'small',
						'data-testid': params.buttonTestId(action),
						'data-variant': noStyle ? undefined : variant,
						onclick: () => {
							params.onAction(action);
						},
						type: 'button',
					},
					params.label(action)
				)
			);
		}
		footer.append(groupElement);
	}
	return footer;
};
