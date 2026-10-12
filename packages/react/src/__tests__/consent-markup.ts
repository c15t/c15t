// Theme styles load after mount; compare the consent markup and track hydration warnings separately.
export const consentMarkup = (container: HTMLElement) => {
	const copy = container.cloneNode(true) as HTMLElement;
	copy.querySelectorAll('style#c15t-theme').forEach((style) => style.remove());
	// Branding appends the browser hostname after mount, without affecting consent.
	copy.querySelectorAll('a[data-branding]').forEach((link) => {
		const href = link.getAttribute('href');
		if (!href) {
			return;
		}
		const url = new URL(href);
		url.searchParams.delete('ref');
		link.setAttribute('href', url.toString().replace(/\/$/u, ''));
	});
	return copy.innerHTML;
};
