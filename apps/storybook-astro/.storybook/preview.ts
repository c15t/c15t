import type { Preview } from '@storybook/html-vite';

// The shipped stylesheet, the same one an Astro site imports. It now
// carries the default theme tokens, so nothing has to inject a theme at
// runtime — which is the whole point of a server-rendered banner.
import '@c15t/astro/styles.css';
import '@c15t/ui/iab/styles.css';

const storybookCanvasStyleId = 'c15t-storybook-canvas';
const canvasCSS = `
	:root {
		color: var(--c15t-text);
		background: var(--c15t-surface-hover);
		font-family: var(--c15t-font-family);
	}

	body {
		font-family: var(--c15t-font-family);
		color: var(--c15t-text);
		background: var(--c15t-surface-hover);
	}
`;

const ensureGlobalStyle = function ensureGlobalStyle(
	id: string,
	cssText: string
) {
	if (typeof document === 'undefined') {
		return;
	}

	if (document.getElementById(id)) {
		return;
	}

	const style = document.createElement('style');
	style.id = id;
	style.textContent = cssText;
	document.head.appendChild(style);
};

ensureGlobalStyle(storybookCanvasStyleId, canvasCSS);

const preview: Preview = {
	parameters: {
		layout: 'fullscreen',
	},
};

export default preview;
