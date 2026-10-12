/**
 * Markdown for one examples payload run.
 */
import { EXAMPLES_PAYLOAD_BOUNDARY_METRICS } from '@c15t/benchmarking/examples-payload';

export interface ReportInput {
	commitSha: string;
	root: string;
	generatedAt: string;
	backendLatencyMs: number;
	failures: { example: string; error: string }[];
	measurements: {
		example: string;
		kind: string;
		notes: string[];
		metrics: Record<string, number | null>;
	}[];
}

const cell = (value: number | null | undefined) =>
	value === null || value === undefined ? 'n/a' : String(value);

const COLUMNS: [string, string][] = [
	['initialJsGzip', 'JS gzip'],
	['initialJsBrotli', 'JS br'],
	['initialJsRaw', 'JS raw'],
	['initialJsRequests', 'JS reqs'],
	['initialCssGzip', 'CSS gzip'],
	['documentGzip', 'HTML gzip'],
	['dialogJsGzip', 'dialog JS'],
	['acceptJsGzip', 'accept JS'],
	['emittedClientJsGzip', 'emitted JS'],
	['bannerVisibleMs', 'banner ms'],
];

const REQUEST_COLUMNS: [string, string][] = [
	['initRequests', 'init'],
	['manifestRequests', 'manifest'],
	['crossOriginRequests', 'cross-origin'],
];

/**
 * Render the run as Markdown tables: sizes, boundary bytes and requests.
 *
 * @param input - The run's detail, with metric values per example.
 */
export const renderReport = function renderReport(input: ReportInput): string {
	const lines = [
		'# Examples payload',
		'',
		`- Checkout: \`${input.root}\` at \`${input.commitSha}\``,
		`- Generated: ${input.generatedAt}`,
		`- Fixture backend latency: ${input.backendLatencyMs} ms`,
		'- Sizes in bytes. JS and CSS are first load (until network idle after load); dialog and accept are the extra JS each interaction loads.',
		'',
		'## First load',
		'',
		`| Example | Kind | ${COLUMNS.map(([, label]) => label).join(' | ')} |`,
		`| --- | --- | ${COLUMNS.map(() => '---:').join(' | ')} |`,
	];
	for (const measurement of input.measurements) {
		lines.push(
			`| ${measurement.example} | ${measurement.kind} | ${COLUMNS.map(([key]) => cell(measurement.metrics[key])).join(' | ')} |`
		);
	}
	lines.push(
		'',
		'## Boundaries and requests',
		'',
		'Boundary bytes are the gzip sizes of first-load JS assets that contain the boundary marker.',
		'',
		`| Example | ${[...EXAMPLES_PAYLOAD_BOUNDARY_METRICS, ...REQUEST_COLUMNS.map(([, label]) => label)].join(' | ')} |`,
		`| --- | ${[...EXAMPLES_PAYLOAD_BOUNDARY_METRICS, ...REQUEST_COLUMNS].map(() => '---:').join(' | ')} |`
	);
	for (const measurement of input.measurements) {
		const values = [
			...EXAMPLES_PAYLOAD_BOUNDARY_METRICS,
			...REQUEST_COLUMNS.map(([key]) => key),
		].map((key) => cell(measurement.metrics[key]));
		lines.push(`| ${measurement.example} | ${values.join(' | ')} |`);
	}
	const notes = input.measurements.filter(
		(measurement) => measurement.notes.length > 0
	);
	if (notes.length > 0 || input.failures.length > 0) {
		lines.push('', '## Notes', '');
		for (const failure of input.failures) {
			lines.push(
				`- **${failure.example}** not measured: ${failure.error.split('\n')[0]}`
			);
		}
		for (const measurement of notes) {
			lines.push(
				`- **${measurement.example}**: ${measurement.notes.join(' ')}`
			);
		}
	}
	return `${lines.join('\n')}\n`;
};
