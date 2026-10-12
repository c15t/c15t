/**
 * One build, one mode per bench route. An app sets `mode` in
 * `nuxt.config.ts` only; the bench swaps it in this request's runtime
 * config (a copy per request on the server, and per page load in the
 * browser) before the c15t plugin reads it. The build mode is `manifest()`,
 * so the consent route exists for the manifest routes.
 */
export default defineNuxtPlugin({
	enforce: 'pre',
	name: 'c15t-bench-route-mode',
	setup() {
		const getRoute = useRoute;
		const getRuntimeConfig = useRuntimeConfig;
		const route = getRoute();
		const c15t = getRuntimeConfig().public.c15t as {
			mode?: Record<string, unknown>;
		};
		const built = c15t.mode ?? { type: 'manifest' };
		if (route.path === '/client-manifest') {
			c15t.mode = { ...built, resolve: 'browser' };
		} else if (route.path !== '/ssr-manifest') {
			c15t.mode = { type: 'hosted' };
		}
	},
});
