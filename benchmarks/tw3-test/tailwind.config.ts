import type { Config } from 'tailwindcss';

const config: Config = {
	content: ['./app/**/*.{ts,tsx}', '../shared/src/**/*.{ts,tsx}'],
	plugins: [],
	theme: {
		extend: {},
	},
};

export default config;
