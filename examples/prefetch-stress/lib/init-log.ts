export interface InitLogEntry {
	id: number;
	at: string;
	path: string;
	purpose: string | null;
	secPurpose: string | null;
	nextRouterPrefetch: string | null;
	middlewarePrefetch: string | null;
	userAgent: string | null;
}

declare global {
	// eslint-disable-next-line no-var
	var __prefetchStressInitLogs: InitLogEntry[] | undefined;
}

function store(): InitLogEntry[] {
	if (!globalThis.__prefetchStressInitLogs) {
		globalThis.__prefetchStressInitLogs = [];
	}
	return globalThis.__prefetchStressInitLogs;
}

export function recordInitRequest(
	headers: Headers,
	path: string
): InitLogEntry {
	const logs = store();

	const entry: InitLogEntry = {
		id: logs.length + 1,
		at: new Date().toISOString(),
		path,
		purpose: headers.get('purpose'),
		secPurpose: headers.get('sec-purpose'),
		nextRouterPrefetch: headers.get('next-router-prefetch'),
		middlewarePrefetch: headers.get('x-middleware-prefetch'),
		userAgent: headers.get('user-agent'),
	};

	logs.push(entry);

	return entry;
}

export function getInitLogs(): InitLogEntry[] {
	return [...store()];
}

export function clearInitLogs(): void {
	store().length = 0;
}
