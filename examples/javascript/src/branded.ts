import { init } from '@c15t/browser';

import { scripts } from './scripts';

const backendURL = import.meta.env.VITE_C15T_BACKEND_URL;
if (!backendURL) {
	throw new Error('Set VITE_C15T_BACKEND_URL to your Inth endpoint');
}

// #region docs:theme title="src/main.ts"
const consent = init({
	backendURL,
	scripts,
	ui: {
		theme: {
			colors: {
				primary: '#6943a3',
				primaryHover: '#533285',
				textOnPrimary: '#ffffff',
			},
			radius: { lg: '18px' },
		},
	},
});
// #endregion docs:theme

document
	.querySelector('#privacy-settings')
	?.addEventListener('click', () => consent.openDialog());
