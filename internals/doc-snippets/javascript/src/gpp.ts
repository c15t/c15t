// #region docs:gpp title="src/main.ts"
import { hosted, init } from '@c15t/browser';
import { mountGPP } from '@c15t/browser/gpp';

const consent = init({
	mode: hosted({ backendURL: 'https://your-project.inth.app' }),
});

// Installs `window.__gpp` and keeps it in step with the visitor's choices.
const gpp = mountGPP(consent);

window.__gpp?.('addEventListener', (event) => {
	const { eventName, data } = event as { eventName: string; data: unknown };
	if (eventName === 'signalStatus' && data === 'ready') {
		console.log('GPP string', gpp.getGPPString());
	}
});
// #endregion docs:gpp
