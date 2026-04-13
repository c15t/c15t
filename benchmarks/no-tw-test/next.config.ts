import type { NextConfig } from 'next';

const transpilePackages = [
	'@c15t/benchmarking',
	'@c15t/react',
	'@c15t/nextjs',
	'c15t',
];

const config: NextConfig = {
	transpilePackages,
};

export default config;
