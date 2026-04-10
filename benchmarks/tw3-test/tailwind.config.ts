import type { Config } from 'tailwindcss';

const config: Config = {
	content: ['./app/**/*.{ts,tsx}', '../shared/src/**/*.{ts,tsx}'],
	theme: {
		extend: {},
	},
	plugins: [],
};

export default config;
