export default defineNuxtPlugin({
	enforce: 'pre',
	name: 'c15t-bench-route-mode',
	setup() {
		const getRoute = useRoute;
		const getAppConfig = useAppConfig;
		const route = getRoute();
		const appConfig = getAppConfig();
		appConfig.c15t = {
			...(appConfig.c15t ?? {}),
			manifest:
				// oxlint-disable-next-line no-nested-ternary -- Preserve established branch order and control flow.
				route.path === '/client-manifest'
					? 'client'
					: route.path === '/ssr-manifest'
						? 'server'
						: false,
		};
	},
});
