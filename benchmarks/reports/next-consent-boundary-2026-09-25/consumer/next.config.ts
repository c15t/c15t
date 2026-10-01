import type { NextConfig } from 'next';

// The c15t docs site sets cacheComponents: true and reactStrictMode.
// BENCH_CACHE_COMPONENTS=0 at build time turns it off for the supplementary run.
const config: NextConfig = {
	cacheComponents: process.env.BENCH_CACHE_COMPONENTS !== '0',
	reactStrictMode: true,
};

export default config;
