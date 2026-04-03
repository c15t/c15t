import { expect, userEvent, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';

function getAccordionItem(trigger: HTMLElement | null) {
	return trigger?.closest('[data-slot="accordion-item"]');
}

function getAccordionContent(item: Element | null) {
	return item?.querySelector('[data-slot="accordion-content"]');
}

function assertMountedAccordionContent(
	canvasElement: HTMLElement,
	count: number
) {
	const contents = canvasElement.querySelectorAll(
		'[data-slot="accordion-content"]'
	);
	expect(contents).toHaveLength(count);

	for (const content of contents) {
		expect(
			content.querySelector('[data-slot="accordion-content-viewport"]')
		).toBeTruthy();
	}
}

/**
 * Verifies single-mode accordion: clicking a trigger opens it and closes the
 * previously open item.
 */
export const singleModeToggle: PlayFunction = async ({ canvasElement }) => {
	const canvas = within(canvasElement);
	const triggers = canvas.getAllByRole('button');
	const firstItem = getAccordionItem(triggers[0] ?? null);
	const secondItem = getAccordionItem(triggers[1] ?? null);
	const firstContent = getAccordionContent(firstItem ?? null);
	const secondContent = getAccordionContent(secondItem ?? null);

	assertMountedAccordionContent(canvasElement, triggers.length);

	// First trigger's content should be open by default (defaultValue)
	await expect(firstItem).toHaveAttribute('data-state', 'open');
	await expect(firstContent).toHaveAttribute('data-state', 'open');
	await expect(secondContent).toHaveAttribute('data-state', 'closed');

	// Click second trigger — it opens, first closes
	await userEvent.click(triggers[1]!);
	await expect(firstItem).toHaveAttribute('data-state', 'closed');
	await expect(firstContent).toHaveAttribute('data-state', 'closed');
	await expect(secondItem).toHaveAttribute('data-state', 'open');
	await expect(secondContent).toHaveAttribute('data-state', 'open');

	// Click second trigger again — it collapses (collapsible mode)
	await userEvent.click(triggers[1]!);
	await expect(secondItem).toHaveAttribute('data-state', 'closed');
	await expect(secondContent).toHaveAttribute('data-state', 'closed');
};

/**
 * Verifies multiple-mode accordion: multiple items can be open simultaneously.
 */
export const multipleModeToggle: PlayFunction = async ({ canvasElement }) => {
	const canvas = within(canvasElement);
	const triggers = canvas.getAllByRole('button');
	const firstItem = getAccordionItem(triggers[0] ?? null);
	const secondItem = getAccordionItem(triggers[1] ?? null);
	const firstContent = getAccordionContent(firstItem ?? null);
	const secondContent = getAccordionContent(secondItem ?? null);

	assertMountedAccordionContent(canvasElement, triggers.length);

	// Both should be open by default (defaultValue includes both)
	await expect(firstItem).toHaveAttribute('data-state', 'open');
	await expect(firstContent).toHaveAttribute('data-state', 'open');
	await expect(secondItem).toHaveAttribute('data-state', 'open');
	await expect(secondContent).toHaveAttribute('data-state', 'open');

	// Close first — second stays open
	await userEvent.click(triggers[0]!);
	await expect(firstItem).toHaveAttribute('data-state', 'closed');
	await expect(firstContent).toHaveAttribute('data-state', 'closed');
	await expect(secondItem).toHaveAttribute('data-state', 'open');
	await expect(secondContent).toHaveAttribute('data-state', 'open');
};
