// #region docs:init
import { init } from '@c15t/browser';
// The policy consentManifest() in vite.config.ts downloaded.
import { snapshot } from 'c15t/generated';

import { scripts } from './scripts';

const consent = init({
	backendURL: import.meta.env.VITE_C15T_BACKEND_URL,
	manifest: snapshot,
	mode: 'manifest',
	scripts,
});

document
	.querySelector('#privacy-settings')
	?.addEventListener('click', () => consent.openDialog());
// #endregion docs:init
