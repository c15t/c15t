import {
	defaultTheme,
	generateThemeCSS,
} from '../../../packages/ui/src/theme/utils';
import '../../../packages/ui/src/styles/primitives/accordion.module.css';
import '../../../packages/ui/src/styles/primitives/button.module.css';
import '../../../packages/ui/src/styles/primitives/switch.module.css';
import type { Preview } from '@storybook/vue3-vite';

const storybookThemeStyleId = 'c15t-storybook-theme';
const storybookCanvasStyleId = 'c15t-storybook-canvas';

const themeCSS = generateThemeCSS(defaultTheme);
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

function ensureGlobalStyle(id: string, cssText: string) {
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
}

ensureGlobalStyle(storybookThemeStyleId, themeCSS);
ensureGlobalStyle(storybookCanvasStyleId, canvasCSS);

const preview: Preview = {
	parameters: {
		layout: 'centered',
	},
};

export default preview;
