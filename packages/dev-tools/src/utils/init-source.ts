import type { ConsentStoreState } from 'c15t';

export function formatInitSource(
	source: ConsentStoreState['initDataSource'],
	detail: string | null | undefined
): string {
	const label = (() => {
		switch (source) {
			case 'ssr':
				return 'SSR Prefetch';
			case 'backend':
				return 'Backend';
			case 'backend-cache-hit':
				return 'Backend (Cache Hit)';
			case 'offline-fallback':
				return 'Offline Fallback';
			case 'offline-mode':
				return 'Offline Mode';
			case 'custom':
				return 'Custom Client';
			default:
				return '—';
		}
	})();

	return detail ? `${label} [${detail}]` : label;
}
