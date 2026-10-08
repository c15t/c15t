// #region docs:env
import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	/** The c15t backend that stores consent. */
	PUBLIC_C15T_BACKEND_URL: {
		public: true,
		// The demo project, which `vite.config.ts` also falls back to.
		schema: (value) => value || 'https://benchmarks-inth.inth.app',
	},
});
// #endregion docs:env
