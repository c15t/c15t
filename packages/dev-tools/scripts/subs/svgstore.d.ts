declare module 'svgstore' {
	type SvgStoreOptions = {
		copyAttrs?: string[];
		svgAttrs?: Record<string, string | boolean>;
		renameDefs?: boolean;
	};

	type ToStringOptions = {
		inline?: boolean;
	};

	type SvgStore = {
		add(id: string, svg: string): SvgStore;
		toString(options?: ToStringOptions): string;
	};

	function svgstore(options?: SvgStoreOptions): SvgStore;

	export = svgstore;
}
