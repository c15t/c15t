import type { Preview } from '@storybook/react-vite';

// The stylesheets ship the `defaultTheme` tokens themselves, so the canvas
// only has to opt into them — no `generateThemeCSS(defaultTheme)` injection.
import '../../../packages/react/src/styles.css';
import '../../../packages/react/src/iab/styles.css';

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
		a11y: {
			test: 'error',
		},
		layout: 'centered',
	},
};

export default preview;
