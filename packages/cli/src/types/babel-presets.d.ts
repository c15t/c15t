declare module '@babel/preset-react' {
	interface BabelPresetAPI {
		caller: (
			predicate: (caller: Record<string, unknown>) => boolean
		) => boolean;
		assertVersion: (version: string | number) => void;
	}

	const preset: (
		api: BabelPresetAPI,
		options?: { runtime?: 'automatic' | 'classic' },
		dirname?: string
	) => {
		presets?: Array<string | [string, Record<string, unknown>?]>;
		plugins?: Array<string | [string, Record<string, unknown>?]>;
	};
	export default preset;
}

declare module '@babel/preset-typescript' {
	interface BabelPresetAPI {
		caller: (
			predicate: (caller: Record<string, unknown>) => boolean
		) => boolean;
		assertVersion: (version: string | number) => void;
	}

	const preset: (
		api: BabelPresetAPI,
		options?: { isTSX?: boolean; allExtensions?: boolean },
		dirname?: string
	) => {
		presets?: Array<string | [string, Record<string, unknown>?]>;
		plugins?: Array<string | [string, Record<string, unknown>?]>;
	};
	export default preset;
}
