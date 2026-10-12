import type { NextConfig } from 'next';

const config: NextConfig = {
	// Demo only: the example has no home page of its own.
	redirects() {
		return Promise.resolve([
			{ destination: '/app-router', permanent: false, source: '/' },
		]);
	},
};

export default config;
