import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	/* config options here */
	async rewrites() {
		return [
			{
				source: '/api/c15t/:path*',
				destination: 'http://localhost:8787/:path*',
			},
		];
	},
};

export default nextConfig;
