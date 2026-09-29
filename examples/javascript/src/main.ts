// #region docs:init
import { init } from '@c15t/browser';

import { scripts } from './scripts';

const backendURL = import.meta.env.VITE_C15T_BACKEND_URL;
if (!backendURL) {
	throw new Error('Set VITE_C15T_BACKEND_URL to your Inth endpoint');
}

const consent = init({ backendURL, scripts });

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
