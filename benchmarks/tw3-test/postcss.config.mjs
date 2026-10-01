const config = {
	// oxlint-disable-next-line sort-keys -- PostCSS runs plugins in key order; c15t's must precede tailwindcss.
	plugins: {
		'@c15t/ui/postcss-tailwind3': {},
		tailwindcss: {},
		autoprefixer: {},
	},
};

export default config;
