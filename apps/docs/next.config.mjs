import { withSentryConfig } from '@sentry/nextjs';
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX({
	configPath: './source.config.ts',
});

/** @type {import('next').NextConfig} */
const config = {
	serverExternalPackages: [
		'oxc-transform',
		'shiki',
		'ts-morph',
		'@libsql/kysely-libsql',
		'libsql',
	],

	images: {
		formats: ['image/avif', 'image/webp'],
		remotePatterns: [
			{
				hostname: 'img.logo.dev',
				protocol: 'https',
			},
		],
	},
	reactStrictMode: true,
	async redirects() {
		return [
			{
				source: '/docs',
				destination: '/docs/getting-started',
				permanent: true,
			},
			{
				source: '/discord',
				destination: 'https://discord.gg/nPJjrw55TZ',
				permanent: false,
			},
			{
				source: '/docs/framework/react/consent-solution',
				destination: '/docs/framework/react/index',
				permanent: true,
			},
			{
				source: '/ingest/static/:path*',
				destination: 'https://eu-assets.i.posthog.com/static/:path*',
				permanent: false,
			},
			{
				source: '/ingest/:path*',
				destination: 'https://eu.i.posthog.com/:path*',
				permanent: false,
			},
			{
				source: '/ingest/decide',
				destination: 'https://eu.i.posthog.com/decide',
				permanent: false,
			},
		];
	},
	skipTrailingSlashRedirect: true,
};

export default withSentryConfig(withMDX(config), {
	// For all available options, see:
	// https://www.npmjs.com/package/@sentry/webpack-plugin#options

	org: process.env.SENTRY_ORG,
	project: process.env.SENTRY_PROJECT,

	// Only print logs for uploading source maps in CI
	silent: !process.env.CI,

	// For all available options, see:
	// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

	// Upload a larger set of source maps for prettier stack traces (increases build time)
	widenClientFileUpload: true,

	// Automatically annotate React components to show their full name in breadcrumbs and session replay
	reactComponentAnnotation: {
		enabled: true,
	},

	// Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
	// This can increase your server load as well as your hosting bill.
	// Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
	// side errors will fail.
	tunnelRoute: '/monitoring',

	// Automatically tree-shake Sentry logger statements to reduce bundle size
	disableLogger: true,

	// Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
	// See the following for more information:
	// https://docs.sentry.io/product/crons/
	// https://vercel.com/docs/cron-jobs
	automaticVercelMonitors: true,
});
