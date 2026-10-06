import { init } from '@c15t/browser';

import { scripts } from './scripts';
import { testBackend } from './test-backend';

const consent = init({
	backendURL: 'https://your-project.inth.app',
	...testBackend('backendURL'),
	scripts,
});

document
	.querySelector('#privacy-settings')
	?.addEventListener('click', () => consent.openDialog());

if (import.meta.env.DEV) {
	const { mountDevTools } = await import('@c15t/browser/devtools');
	mountDevTools(consent, { defaultTab: 'scripts' });
}
