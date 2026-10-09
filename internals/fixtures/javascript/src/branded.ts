import { hosted, init } from '@c15t/browser';

import { scripts } from './scripts';
import { testBackend } from './test-backend';

const consent = init({
	mode: hosted({
		backendURL: 'https://your-project.inth.app',
		...testBackend('backendURL'),
	}),
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

document
	.querySelector('#privacy-settings')
	?.addEventListener('click', () => consent.openDialog());
