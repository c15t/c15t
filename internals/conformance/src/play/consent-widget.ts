import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';

/**
 * Expands the marketing category, then one vendor card under it, and turns
 * that vendor off in the draft. The category is on in these stories, so the
 * switches are live and no hint shows.
 */
export const expandedVendors: PlayFunction = async ({ canvasElement }) => {
	const canvas = within(canvasElement);
	const categoryTrigger = await canvas.findByTestId(
		'consent-widget-accordion-trigger-marketing'
	);
	const categoryContent = await canvas.findByTestId(
		'consent-widget-accordion-content-marketing'
	);
	await userEvent.click(categoryTrigger);
	await waitFor(() => {
		expect(categoryContent).toHaveAttribute('data-state', 'open');
	});

	const vendorTrigger = await canvas.findByTestId(
		'consent-widget-vendor-trigger-marketing-meta-pixel'
	);
	const vendorContent = await canvas.findByTestId(
		'consent-widget-vendor-content-marketing-meta-pixel'
	);
	await userEvent.click(vendorTrigger);
	await waitFor(() => {
		expect(vendorTrigger).toHaveAttribute('aria-expanded', 'true');
		expect(vendorContent).toHaveAttribute('data-state', 'open');
	});

	const vendorSwitch = await canvas.findByRole('switch', {
		name: 'Allow Meta Pixel',
	});
	expect(vendorSwitch).toHaveAttribute('aria-checked', 'true');
	await userEvent.click(vendorSwitch);
	await waitFor(() => {
		expect(vendorSwitch).toHaveAttribute('aria-checked', 'false');
		expect(
			canvas.queryByTestId('consent-widget-vendor-hint-marketing')
		).toBeNull();
	});
};

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
