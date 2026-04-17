import { expect } from 'storybook/test';
import { DOM_CONTRACT } from '../contract/dom-contract';

/**
 * Implicit ARIA role for common elements (narrow — extend as needed).
 * Reference: https://www.w3.org/TR/html-aria/
 */
function implicitRole(el: Element): string | undefined {
	const tag = el.tagName.toLowerCase();
	switch (tag) {
		case 'button':
			return 'button';
		case 'h1':
		case 'h2':
		case 'h3':
		case 'h4':
		case 'h5':
		case 'h6':
			return 'heading';
		case 'a':
			return (el as HTMLAnchorElement).hasAttribute('href')
				? 'link'
				: undefined;
		case 'nav':
			return 'navigation';
		case 'main':
			return 'main';
		case 'section':
			return 'region';
		case 'dialog':
			return 'dialog';
		default:
			return undefined;
	}
}

function resolveRole(el: Element): string | undefined {
	return el.getAttribute('role') ?? implicitRole(el);
}

/**
 * Assert that every element declared in the DOM contract for `componentKey`
 * is present in `root` with the declared role and attributes.
 */
export function assertDomContract(
	root: ParentNode,
	componentKey: keyof typeof DOM_CONTRACT
): void {
	const contract = DOM_CONTRACT[componentKey];
	if (!contract) {
		throw new Error(`No DOM contract registered for '${componentKey}'`);
	}

	for (const spec of contract.elements) {
		const node = root.querySelector(
			`[data-testid="${spec.testId}"]`
		) as HTMLElement | null;
		expect(node, `missing [data-testid="${spec.testId}"]`).not.toBeNull();
		if (!node) continue;

		const role = resolveRole(node);
		expect(role, `role for [data-testid="${spec.testId}"]`).toBe(spec.role);

		for (const attr of spec.requiredAttrs ?? []) {
			expect(
				node.hasAttribute(attr),
				`[data-testid="${spec.testId}"] missing attr '${attr}'`
			).toBe(true);
		}
		for (const [attr, value] of Object.entries(spec.exactAttrs ?? {})) {
			expect(
				node.getAttribute(attr),
				`[data-testid="${spec.testId}"] attr '${attr}'`
			).toBe(value);
		}
	}
}

/**
 * Assert the subset of stable elements are present — used when a component
 * may omit optional elements (e.g., branding when disabled) but must always
 * render the core set.
 */
export function assertStableElements(
	root: ParentNode,
	componentKey: keyof typeof DOM_CONTRACT
): void {
	const contract = DOM_CONTRACT[componentKey];
	for (const testId of contract.stableElements) {
		const node = root.querySelector(`[data-testid="${testId}"]`);
		expect(node, `missing stable [data-testid="${testId}"]`).not.toBeNull();
	}
}
