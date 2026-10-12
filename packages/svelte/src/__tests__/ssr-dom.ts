/** Compare actual prompt and persistent trigger elements across portal relocation.
 * Only Svelte hydration comments are removed; elements, attributes and text remain.
 */
export const serializeConsentDom = function serializeConsentDom(
	root: ParentNode
): string {
	return ['consent-banner-root', 'consent-dialog-trigger']
		.map((id) => {
			const element = root.querySelector(`[data-testid="${id}"]`);
			if (!element) {
				return '';
			}
			const clone = element.cloneNode(true) as Element;
			const removeComments = (node: Node) => {
				if (node instanceof Element) {
					const attributes = [...node.attributes]
						.map(({ name, value }) => [name, value] as const)
						.sort(([left], [right]) => left.localeCompare(right));
					for (const attribute of [...node.attributes]) {
						node.removeAttribute(attribute.name);
					}
					for (const [name, value] of attributes) {
						node.setAttribute(name, value);
					}
				}
				for (const child of [...node.childNodes]) {
					if (
						child.nodeType === Node.COMMENT_NODE &&
						/^(?:\[(?:-?\d+)?|\]|\$[\w-]+)?$/u.test(child.textContent ?? '')
					) {
						child.remove();
					} else {
						removeComments(child);
					}
				}
			};
			removeComments(clone);
			return clone.outerHTML;
		})
		.join('');
};

/** Measure visibility through the rendered element and every actual ancestor. */
export const isConsentElementVisible = (element: Element | null): boolean => {
	if (!element) {
		return false;
	}
	for (
		let current: Element | null = element;
		current;
		current = current.parentElement
	) {
		const style = getComputedStyle(current);
		if (
			current.hasAttribute('hidden') ||
			style.display === 'none' ||
			style.visibility === 'hidden' ||
			style.visibility === 'collapse' ||
			style.opacity === '0'
		) {
			return false;
		}
	}
	return true;
};
