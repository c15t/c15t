// In-process store of server-side consent resolution times per sample.
export interface ResolutionTiming {
	startedAt: number;
	resolvedAt: number;
	hasPolicy: boolean;
}

const store = globalThis as typeof globalThis & {
	__benchTimings?: Map<string, ResolutionTiming>;
};

const timings = (): Map<string, ResolutionTiming> => {
	store.__benchTimings ??= new Map();
	return store.__benchTimings;
};

export const recordTiming = (sample: string, timing: ResolutionTiming) => {
	timings().set(sample, timing);
};

export const readTiming = (sample: string) => timings().get(sample) ?? null;
