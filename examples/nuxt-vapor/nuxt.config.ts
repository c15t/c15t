/**
 * c15t on Nuxt 4.6 with Vue Vapor.
 *
 * `vue.vapor` turns on Nuxt's Vapor interop. Every page and component in
 * `app/` opts in with `<script setup vapor>`, while the c15t components stay
 * on the virtual DOM and render inside them.
 *
 * The acceptance suite points the demo at a mock backend with
 * `NUXT_PUBLIC_C15T_BACKEND_URL`. Otherwise it uses the @c15t/backend it
 * self-hosts at `/api/self-host` (see `server/api/self-host/[...all].ts`).
 *
 * `C15T_NUXT_FUTURE=1` builds with the Nuxt 5 preview
 * (`future.compatibilityVersion: 5`) and the 4.6 opt-ins that touch
 * rendering: `early404` and prerendered error pages.
 */
import type { ModuleOptions } from 'c15t/vue';

const future = process.env.C15T_NUXT_FUTURE === '1';
// Demo only: the self-hosted backend, or the suite's mock backend.
const demo: Partial<ModuleOptions> = {
	backendURL: process.env.NUXT_PUBLIC_C15T_BACKEND_URL ?? '/api/self-host',
};

// #region docs:nuxt-config title="nuxt.config.ts"
export default defineNuxtConfig({
	c15t: {
		backendURL: 'https://your-project.inth.app',
		manifest: 'server',
		// #hide docs
		...demo,
		// #endhide docs
	},
	// #hide docs
	compatibilityDate: '2026-10-05',
	css: ['~/consent-example.css'],
	devtools: { enabled: true },
	...(future && {
		experimental: { early404: true, prerenderErrorPages: true },
		future: { compatibilityVersion: 5 },
	}),
	// #endhide docs
	modules: ['c15t/vue'],
	// #hide docs
	typescript: { strict: true },
	// #endhide docs
	// Vapor needs Vue 3.6. Opt components in with `<script setup vapor>`.
	vue: { vapor: true },
});
// #endregion docs:nuxt-config
