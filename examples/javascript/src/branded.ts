import { init } from '@c15t/browser';

import { scripts } from './scripts';
import { testBackend } from './test-backend';

// #region docs:theme title="src/main.ts"
const consent = init({
	backendURL: 'https://your-project.inth.app',
	// #hide docs
	...testBackend('backendURL'),
	// #endhide docs
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
