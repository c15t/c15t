const tailnetURL = process.env.PORTLESS_TAILSCALE_URL;

export default defineNuxtConfig({
	c15t: {
		backendURL: 'https://nuxt-consent-io.inth.app',
		consentCategories: ['necessary', 'measurement', 'marketing'],
	},
	devtools: { enabled: true },
	modules: ['../src/module'],
	vite: {
		...(tailnetURL && {
			devtools: { allowedOrigins: [new URL(tailnetURL).origin] },
		}),
		server: { allowedHosts: ['.ts.net'] },
	},
});
