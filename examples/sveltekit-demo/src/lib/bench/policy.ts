export const BENCHMARK_POLICY = {
	id: 'svelte-browser-bench',
	model: 'opt-in' as const,
	consent: {
		categories: ['necessary', 'measurement', 'marketing'],
		scopeMode: 'permissive' as const,
	},
	ui: {
		mode: 'banner' as const,
	},
};
