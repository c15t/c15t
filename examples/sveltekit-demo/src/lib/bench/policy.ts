export const BENCHMARK_POLICY = {
	consent: {
		categories: ['necessary', 'measurement', 'marketing'],
		scopeMode: 'permissive' as const,
	},
	id: 'svelte-browser-bench',
	model: 'opt-in' as const,
	ui: {
		mode: 'banner' as const,
	},
};
