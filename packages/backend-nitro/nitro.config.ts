//https://nitro.unjs.io/config
export default defineNitroConfig({
	srcDir: 'server',
	compatibilityDate: '2025-03-18',
	typescript: {
		strict: true,
	},
	runtimeConfig: {
		// Config available on both server and client
		public: {
			apiBase: '/api',
			appName: 'backend-nitro',
			logger: {
				level: 'info',
				prefix: '🪢 doubletie',
			},
		},
		// Server-only config (not exposed to the client)
		c15t: {
			secret: process.env.C15T_SECRET || 'development-secret',
			originCheck: {
				enabled: process.env.ORIGIN_CHECK_ENABLED !== 'false',
				allowedDomains: (process.env.ALLOWED_DOMAINS || '')
					.split(',')
					.filter(Boolean),
				// Additional domains beyond localhost, 127.0.0.1 etc
				skipPaths: (process.env.ORIGIN_CHECK_SKIP_PATHS || '/_docs,/static')
					.split(',')
					.filter(Boolean),
			},
		},
	},
	experimental: {
		openAPI: true,
	},
	openAPI: {
		// production: 'runtime',
		meta: {
			title: 'My Awesome Project',
			description: 'This might become the next big thing.',
			version: '1.0',
		},
		route: '/_docs/openapi.json',
		ui: {
			scalar: {
				route: '/_docs/scalar',
				theme: 'purple',
			},
			swagger: {
				route: '/_docs/swagger',
			},
		},
	},
	// For debugging
	logging: {
		compressedSizes: true,
		buildSuccess: true,
	},
});
