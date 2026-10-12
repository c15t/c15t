// The Vapor variant of the module setup. Not loaded by this app, which stays
// on Vue 3.5; `vapor/tsconfig.json` type-checks it.
import { defineNuxtConfig } from 'nuxt/config';

// #region docs:vapor-nuxt-config title="nuxt.config.ts"
export default defineNuxtConfig({
	c15t: { backendURL: 'https://your-project.inth.app' },
	modules: ['c15t/vue'],
	// Vapor needs Vue 3.6. Opt components in with `<script setup vapor>`.
	vue: { vapor: true },
});
// #endregion docs:vapor-nuxt-config
