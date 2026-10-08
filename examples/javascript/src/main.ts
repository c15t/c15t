// #region docs:init
import { init } from '@c15t/browser';

import { consentManifest } from './c15t-manifest';
import { scripts } from './scripts';

const consent = init({
	backendURL:
		import.meta.env.VITE_C15T_BACKEND_URL ?? 'https://benchmarks-inth.inth.app',
	manifest: consentManifest,
	mode: 'manifest',
	scripts,
});

document
	.querySelector('#privacy-settings')
	?.addEventListener('click', () => consent.openDialog());
// #endregion docs:init
