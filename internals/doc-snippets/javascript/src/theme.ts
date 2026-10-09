import { hosted, init } from '@c15t/browser';

import { scripts } from './scripts';

// #region docs:theme title="src/main.ts"
const consent = init({
	mode: hosted({ backendURL: 'https://your-project.inth.app' }),
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
