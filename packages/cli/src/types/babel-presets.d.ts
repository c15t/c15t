declare module '@babel/preset-react' {
	const preset: (
		api: unknown,
		options?: { runtime?: 'automatic' | 'classic' }
	) => {
		presets?: unknown[];
		plugins?: unknown[];
	};
	export default preset;
}

declare module '@babel/preset-typescript' {
	const preset: (
		api: unknown,
		options?: { isTSX?: boolean; allExtensions?: boolean }
	) => {
		presets?: unknown[];
		plugins?: unknown[];
	};
	export default preset;
}
