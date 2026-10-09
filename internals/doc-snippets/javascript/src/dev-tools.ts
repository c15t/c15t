import { hosted, init } from '@c15t/browser';

import { runtime } from './consent-runtime';

const consent = init({
	mode: hosted({ backendURL: 'https://your-project.inth.app' }),
});

// #region docs:devtools title="src/main.ts"
if (import.meta.env.DEV) {
	const { mountDevTools } = await import('@c15t/browser/devtools');
	mountDevTools(consent, { defaultTab: 'scripts' });
}
// #endregion docs:devtools

const { kernel } = runtime;

// #region docs:runtime-devtools title="src/consent-ui.ts"
if (import.meta.env.DEV) {
	const { createDevTools } = await import('@c15t/dev-tools');
	const tools = createDevTools({ kernel });
	import.meta.hot?.dispose(() => tools.destroy());
}
// #endregion docs:runtime-devtools
