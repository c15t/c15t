/**
 * Server timing marks for the cold-start benchmark. Marks live on
 * `globalThis` so every route bundle in the process shares one list.
 * Times are epoch milliseconds from `performance.timeOrigin + now()`, so the
 * harness can line them up with browser and mock-backend clocks.
 */
export interface BenchMark {
	name: string;
	at: number;
	sinceProcessStartMs: number;
	detail?: Record<string, unknown>;
}

const store = globalThis as typeof globalThis & {
	__c15tBenchMarks?: BenchMark[];
};

export const mark = function mark(
	name: string,
	detail?: Record<string, unknown>
): number {
	const now = performance.now();
	store.__c15tBenchMarks ??= [];
	store.__c15tBenchMarks.push({
		at: performance.timeOrigin + now,
		detail,
		name,
		sinceProcessStartMs: now,
	});
	return now;
};

/** Record a mark whose `detail.ms` is the time since `start` (a `mark` result). */
export const markSince = function markSince(
	name: string,
	start: number,
	detail?: Record<string, unknown>
): number {
	return mark(name, { ...detail, ms: performance.now() - start });
};

export const drainMarks = function drainMarks(): BenchMark[] {
	const marks = store.__c15tBenchMarks ?? [];
	store.__c15tBenchMarks = [];
	return marks;
};
