// #region docs:env
import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	/** The c15t backend that resolves and stores consent. */
	PUBLIC_C15T_BACKEND_URL: {
		public: true,
		schema: (value) => value || 'https://your-project.inth.app',
	},
});
// #endregion docs:env
