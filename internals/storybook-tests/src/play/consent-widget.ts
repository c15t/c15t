import { expect, userEvent, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';

/**
 * Expands accordion categories and verifies single-open behavior:
 * opening one category closes the previously open one.
 */
export const expandedCategories: PlayFunction = async ({ canvasElement }) => {
	const canvas = within(canvasElement);
	const functionalityTrigger = await canvas.findByTestId(
		'consent-widget-accordion-trigger-functionality'
	);
	const analyticsTrigger = await canvas.findByTestId(
		'consent-widget-accordion-trigger-measurement'
	);
	const functionalityContent = await canvas.findByTestId(
		'consent-widget-accordion-content-functionality'
	);
	const analyticsContent = await canvas.findByTestId(
		'consent-widget-accordion-content-measurement'
	);

	await userEvent.click(functionalityTrigger);
	await expect(functionalityContent).toHaveAttribute('data-state', 'open');
	await expect(analyticsContent).toHaveAttribute('data-state', 'closed');

	await userEvent.click(analyticsTrigger);
	await expect(functionalityContent).toHaveAttribute('data-state', 'closed');
	await expect(analyticsContent).toHaveAttribute('data-state', 'open');
};
