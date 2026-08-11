import type { NextConfig } from 'next';

const transpilePackages = [
	'@c15t/benchmarking',
	'@c15t/react',
	'@c15t/nextjs',
	'@c15t/ui',
	'@c15t/core',
];

const config: NextConfig = {
	transpilePackages,
};

export default config;
