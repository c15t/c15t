import type { Preview } from '@storybook/vue3-vite';

// The stylesheets ship the `defaultTheme` tokens themselves, so the canvas
// only has to opt into them — no `generateThemeCSS(defaultTheme)` injection.
import '../../../packages/ui/dist/styles.css';
// IAB styles match the react preview import set — the parity runner compares
// computed CSS custom properties per element, so both storybooks must load
// the same stylesheet set even for non-IAB stories.
import '../../../packages/ui/dist/iab/styles.css';

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
		layout: 'centered',
	},
};

export default preview;
