import { expect, userEvent, waitFor, within } from 'storybook/test';
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
	await waitFor(() => {
		expect(functionalityContent).toHaveAttribute('data-state', 'open');
		expect(analyticsContent).toHaveAttribute('data-state', 'closed');
	});

	await userEvent.click(analyticsTrigger);
	await waitFor(() => {
		expect(functionalityContent).toHaveAttribute('data-state', 'closed');
		expect(analyticsContent).toHaveAttribute('data-state', 'open');
		const viewport = analyticsContent.querySelector(
			'[data-slot="preference-item-content-viewport"]'
		);
		expect(viewport).not.toBeNull();
		if (viewport) {
			expect(
				Number.parseFloat(getComputedStyle(viewport).paddingInlineStart)
			).toBeGreaterThan(0);
			expect(
				Number.parseFloat(getComputedStyle(viewport).paddingInlineEnd)
			).toBeGreaterThan(0);
		}
		const arrow = canvas.getByTestId(
			'consent-widget-accordion-arrow-measurement'
		);
		expect(getComputedStyle(arrow).transform).toBe('none');
	});
};
