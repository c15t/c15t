// Reference code for the transports page. No page in this example imports
// it; `bun run check-types` compiles it with the rest of the app.
// #region docs:transport-manifest title="src/consent-runtime.ts"
import { manifest } from '@c15t/browser';
import { createConsentRuntime } from 'c15t/runtime';

// Fetch the backend's public manifest and resolve the policy in the browser.
// Saves still go to the backend.
export const runtime = createConsentRuntime({
	mode: manifest({ manifestURL: 'https://your-project.inth.app/manifest' }),
});
// #endregion docs:transport-manifest
