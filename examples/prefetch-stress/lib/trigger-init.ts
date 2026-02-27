import { fetchInitialData } from '@c15t/nextjs';

const BACKEND_URL =
	process.env.PREFETCH_STRESS_BACKEND_URL ?? 'http://localhost:4010/api/c15t';

export function triggerInitProbe(label: string): void {
	if (process.env.NODE_ENV !== 'production') {
		console.log(`[prefetch-stress] triggerInitProbe: ${label}`);
	}

	void fetchInitialData({
		backendURL: BACKEND_URL,
		debug: true,
	});
}
