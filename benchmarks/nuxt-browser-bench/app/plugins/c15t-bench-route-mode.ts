export default defineNuxtPlugin({
	name: 'c15t-bench-route-mode',
	enforce: 'pre',
	setup() {
		const getRoute = useRoute;
		const getAppConfig = useAppConfig;
		const route = getRoute();
		const appConfig = getAppConfig();
		appConfig.c15t = {
			...(appConfig.c15t ?? {}),
			manifest:
				route.path === '/client-manifest'
					? 'client'
					: route.path === '/ssr-manifest'
						? 'server'
						: false,
		};
	},
});
