/** Remove hydration comment nodes without changing attributes or text. */
export const serializeWithoutComments = function serializeWithoutComments(
	element: Element
): string {
	const clone = element.cloneNode(true);
	if (!(clone instanceof Element)) {
		throw new TypeError('Expected an element clone');
	}
	const walker = element.ownerDocument.createTreeWalker(
		clone,
		NodeFilter.SHOW_COMMENT
	);
	const comments: Node[] = [];
	while (walker.nextNode()) {
		comments.push(walker.currentNode);
	}
	for (const comment of comments) {
		comment.parentNode?.removeChild(comment);
	}
	return clone.outerHTML;
};
