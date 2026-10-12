/** Validate sample counts before starting a browser or writing an artifact. */
export const parseIterations = (
	value: string | undefined,
	fallback: number
) => {
	const iterations = Number(value ?? fallback);
	if (!Number.isSafeInteger(iterations) || iterations < 1) {
		throw new Error('BENCH_ITERATIONS must be a positive safe integer');
	}
	return iterations;
};

/** Remove workstation paths from Vite resource URLs while retaining module names. */
export const normalizeResourceName = (name: string, workspaceRoot: string) => {
	const marker = '/@fs/';
	const start = name.indexOf(marker);
	if (start === -1) {
		return name;
	}
	const path = decodeURIComponent(name.slice(start + marker.length));
	const root = workspaceRoot.replace(/\\/gu, '/').replace(/\/$/u, '');
	const absolute = path.startsWith('/') ? path : `/${path}`;
	const relative = absolute.startsWith(`${root}/`)
		? `<workspace>/${absolute.slice(root.length + 1)}`
		: `<external>/${absolute.split('/').at(-1)}`;
	return `${name.slice(0, start)}${marker}${relative}`;
};

interface DialogSample {
	mounted: number;
	visible: number;
	fullyVisible: number;
	resources: { name: string; end: number }[];
}
const median = (values: number[]) => {
	if (!values.length) {
		throw new Error('Cannot summarize empty samples');
	}
	const sorted = values.toSorted((left, right) => left - right);
	const middle = Math.floor(sorted.length / 2);
	const upper = sorted[middle];
	if (upper === undefined) {
		throw new Error('Cannot summarize empty samples');
	}
	return sorted.length % 2
		? upper
		: ((sorted[middle - 1] ?? upper) + upper) / 2;
};

/** Summarize per-sample JS/CSS completion and reveal timing; no download is null. */
export const summarizeDialogSamples = (samples: DialogSample[]) => {
	const downloads = samples.map((sample) => {
		const resources = sample.resources.filter((resource) =>
			/\.(?:js|css)(?:[?#]|$)/u.test(resource.name)
		);
		return resources.length
			? Math.max(...resources.map((resource) => resource.end))
			: null;
	});
	const completion = downloads.filter((value) => value !== null);
	const gaps = samples.flatMap((sample, index) => {
		const end = downloads[index];
		return end === null || end === undefined ? [] : [sample.mounted - end];
	});
	return {
		downloadToMount: gaps.length ? median(gaps) : null,
		downloadsComplete: completion.length ? median(completion) : null,
		fullyVisible: median(samples.map((sample) => sample.fullyVisible)),
		mounted: median(samples.map((sample) => sample.mounted)),
		visible: median(samples.map((sample) => sample.visible)),
	};
};
