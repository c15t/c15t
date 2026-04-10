import type { NextConfig } from 'next';

const config: NextConfig = {
	allowedDevOrigins: [
		'pigeon-post.localhost',
		'*.pigeon-post.localhost',
		'css-module-strategy.pigeon-post.localhost',
		'theme-rc-bugs.pigeon-post.localhost',
	],
	async rewrites() {
		return [
			{
				source: '/api/pigeon/:path*',
				destination: 'https://inth-status-europe-pigeon.c15t.dev/:path*',
			},
		];
	},
};

export default config;
