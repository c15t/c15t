// Reference code for the GPP page. No page in this example imports it;
// `bun run check-types` compiles it with the rest of the app.
// #region docs:gpp title="src/main.ts"
import { init } from '@c15t/browser';
import { createGPP } from '@c15t/iab/gpp';

const consent = init({ backendURL: 'https://your-project.inth.app' });

// Installs `__gpp` at once. Vendors that call it before the policy resolves
// queue or read `signalStatus: 'not ready'`.
const gpp = createGPP({ kernel: consent.runtime.kernel });

window.__gpp?.('addEventListener', (event) => {
	const { eventName, data } = event as { eventName: string; data: unknown };
	if (eventName === 'signalStatus' && data === 'ready') {
		console.log('GPP string', gpp.getGPPString());
	}
});
// #endregion docs:gpp
