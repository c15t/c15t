// #region docs:env
import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	/** The c15t backend that stores consent. */
	PUBLIC_C15T_BACKEND_URL: {
		public: true,
		// Inlined at build time, like the manifest `vite.config.ts` bundles.
		static: true,
	},
});
// #endregion docs:env
