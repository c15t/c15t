import { expect, userEvent, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';

/**
 * Verifies tab switching: clicking a tab activates it and shows its panel.
 */
export const tabSwitching: PlayFunction = async ({ canvasElement }) => {
	const canvas = within(canvasElement);
	const tabs = canvas.getAllByRole('tab');

	// First tab should be selected by default
	await expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
	await expect(tabs[1]).toHaveAttribute('aria-selected', 'false');

	// Click second tab
	await userEvent.click(tabs[1]!);
	await expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
	await expect(tabs[1]).toHaveAttribute('aria-selected', 'true');

	// Verify only active panel is visible
	const panels = canvas.getAllByRole('tabpanel');
	await expect(panels).toHaveLength(1);
};

/**
 * Verifies keyboard navigation: arrow keys move between tabs.
 */
export const keyboardNavigation: PlayFunction = async ({ canvasElement }) => {
	const canvas = within(canvasElement);
	const tabs = canvas.getAllByRole('tab');

	// Focus first tab
	await userEvent.click(tabs[0]!);
	await expect(tabs[0]).toHaveFocus();

	// Arrow right → second tab
	await userEvent.keyboard('{ArrowRight}');
	await expect(tabs[1]).toHaveFocus();

	// Arrow right → third tab
	await userEvent.keyboard('{ArrowRight}');
	await expect(tabs[2]).toHaveFocus();

	// Arrow right wraps → first tab
	await userEvent.keyboard('{ArrowRight}');
	await expect(tabs[0]).toHaveFocus();
};
