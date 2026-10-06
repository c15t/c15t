// #region docs:init
import { init } from '@c15t/browser/hosted';

import { scripts } from './scripts';

const consent = init({
	backendURL: 'https://your-project.inth.app',
	scripts,
});

document
	.querySelector('#privacy-settings')
	?.addEventListener('click', () => consent.openDialog());
// #endregion docs:init
