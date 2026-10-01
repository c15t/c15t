// #region docs:init
import { init } from '@c15t/browser';

import { scripts } from './scripts';
// #hide docs
import { testBackend } from './test-backend';
// #endhide docs

const consent = init({
	backendURL: 'https://your-project.inth.app',
	// #hide docs
	...testBackend('backendURL'),
	// #endhide docs
	scripts,
});

document
	.querySelector('#privacy-settings')
	?.addEventListener('click', () => consent.openDialog());
// #endregion docs:init

// #region docs:devtools title="src/main.ts"
if (import.meta.env.DEV) {
	const { mountDevTools } = await import('@c15t/browser/devtools');
	mountDevTools(consent, { defaultTab: 'scripts' });
}
// #endregion docs:devtools
