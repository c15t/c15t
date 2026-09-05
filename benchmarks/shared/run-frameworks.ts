#!/usr/bin/env node
/**
 * Cross-framework browser-runtime report.
 *
 * Reads every framework directory under the browser-runtime results
 * directory (`nextjs`, `tanstack-start`, `nuxt`, ...), pairs results by
 * scenario name, and writes one table per scenario with each framework's
 * median and p95 plus the median delta against the base framework.
 * Scenarios that only one framework ran are listed separately.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { indexMetrics } from './src/reporting';
import { BENCHMARK_SCHEMA_VERSION } from './src/schema';
import type {
	BenchmarkFramework,
	BenchmarkMetadata,
	BenchmarkResult,
	MetricSampleSet,
} from './src/schema';
import { formatMetric, listJsonFiles, readJson, writeJson } from './src/utils';

const readCliFlag = function readCliFlag(name: string): string | undefined {
	const index = process.argv.indexOf(name);
	if (index >= 0) {
		return process.argv[index + 1];
	}

	const prefix = `${name}=`;
	const match = process.argv.find((arg) => arg.startsWith(prefix));
	return match?.slice(prefix.length);
};

const resultsDir =
	readCliFlag('--results-dir') ??
	process.env.BENCHMARK_FRAMEWORKS_DIR ??
	'.benchmarks/current/browser-runtime';
const outputDir =
	readCliFlag('--output-dir') ??
	process.env.BENCHMARK_COMPARE_DIR ??
	'.benchmarks/compare';
const baseFramework =
	readCliFlag('--base') ?? process.env.BENCHMARK_BASE_FRAMEWORK ?? 'nextjs';
const frameworkFilter = (
	readCliFlag('--frameworks') ??
	process.env.BENCHMARK_FRAMEWORKS ??
	''
)
	.split(',')
	.map((value) => value.trim())
	.filter(Boolean);

/** Metrics compared per scenario, in table order. */
export const comparedMetrics = [
	'ttfbMs',
	'htmlDoneMs',
	'bannerReadyMs',
	'bannerVisibleMs',
	'bannerPaintMs',
	'jsBytes',
	'interactionLatencyMs',
	'initRequestsAfterLoad',
	'manifestRequestsAfterLoad',
	'cls',
	'longTaskTotalMs',
] as const;

/** Canonical arm order; anything else sorts alphabetically after these. */
const scenarioOrder = [
	'baseline',
	'client',
	'manifest-client',
	'ssr',
	'manifest-ssr',
	'repeat-visitor',
] as const;

export interface FrameworkMetricSummary {
	unit: MetricSampleSet['unit'];
	median: number | null;
	p95: number | null;
}

export interface FrameworkScenarioSummary {
	/** Directory name under the results dir, e.g. `tanstack-start`. */
	framework: string;
	/** `framework` field the runner recorded, e.g. `vue` for the Nuxt arm. */
	recordedFramework: BenchmarkFramework;
	package: string;
	scenario: string;
	file: string;
	timestamp: string;
	bannerInFirstHtml: boolean | null;
	metadata: BenchmarkMetadata;
	metrics: Record<string, FrameworkMetricSummary>;
}

export interface FrameworkComparisonDelta {
	metric: string;
	framework: string;
	/** `other median − base median`, in the metric's unit. */
	delta: number | null;
	deltaPercent: number | null;
}

export interface SharedScenarioComparison {
	scenario: string;
	arms: FrameworkScenarioSummary[];
	deltas: FrameworkComparisonDelta[];
}

export interface FrameworksComparisonResult {
	schemaVersion: number;
	generatedAt: string;
	resultsDir: string;
	baseFramework: string;
	frameworks: string[];
	metrics: string[];
	shared: SharedScenarioComparison[];
	exclusive: { framework: string; scenarios: FrameworkScenarioSummary[] }[];
}

const listFrameworkDirectories = function listFrameworkDirectories(
	dir: string
): string[] {
	let entries: string[] = [];
	try {
		entries = readdirSync(dir, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name);
	} catch {
		return [];
	}
	const filtered =
		frameworkFilter.length > 0
			? entries.filter((name) => frameworkFilter.includes(name))
			: entries;
	return filtered.sort((a, b) => {
		if (a === baseFramework) {
			return -1;
		}
		if (b === baseFramework) {
			return 1;
		}
		return a.localeCompare(b);
	});
};

const readMetadataBoolean = function readMetadataBoolean(
	metadata: BenchmarkMetadata | undefined,
	key: string
): boolean | null {
	const value = metadata?.[key];
	return typeof value === 'boolean' ? value : null;
};

const summarizeResult = function summarizeResult(
	framework: string,
	file: string,
	result: BenchmarkResult
): FrameworkScenarioSummary {
	const indexed = indexMetrics(result);
	const metrics: Record<string, FrameworkMetricSummary> = {};
	for (const name of comparedMetrics) {
		const metric = indexed.get(name);
		metrics[name] = {
			median: metric?.median ?? null,
			p95: metric?.p95 ?? null,
			unit: metric?.unit ?? 'count',
		};
	}
	return {
		bannerInFirstHtml: readMetadataBoolean(
			result.metadata,
			'bannerInFirstHtml'
		),
		file,
		framework,
		metadata: result.metadata ?? {},
		metrics,
		package: result.package,
		recordedFramework: result.framework,
		scenario: result.scenario,
		timestamp: result.timestamp,
	};
};

const loadFramework = function loadFramework(
	framework: string
): Map<string, FrameworkScenarioSummary> {
	const byScenario = new Map<string, FrameworkScenarioSummary>();
	for (const file of listJsonFiles(join(resultsDir, framework))) {
		const result = readJson<BenchmarkResult>(file);
		if (result.suite !== 'browser-runtime') {
			continue;
		}
		const summary = summarizeResult(framework, file, result);
		const existing = byScenario.get(result.scenario);
		// Keep the newest run when a directory holds more than one file for
		// a scenario.
		if (!existing || existing.timestamp < summary.timestamp) {
			byScenario.set(result.scenario, summary);
		}
	}
	return byScenario;
};

const scenarioRank = function scenarioRank(scenario: string): number {
	const base = scenario.split(':')[0]?.replace(/-(?:cold|steady)$/u, '') ?? '';
	const index = scenarioOrder.indexOf(base as (typeof scenarioOrder)[number]);
	return index === -1 ? scenarioOrder.length : index;
};

const compareScenarios = function compareScenarios(
	a: string,
	b: string
): number {
	// Plain arms first, then profile variants, each in canonical order.
	const aVariant = a.includes(':') ? 1 : 0;
	const bVariant = b.includes(':') ? 1 : 0;
	if (aVariant !== bVariant) {
		return aVariant - bVariant;
	}
	const rank = scenarioRank(a) - scenarioRank(b);
	return rank === 0 ? a.localeCompare(b) : rank;
};

const computeDeltas = function computeDeltas(
	arms: FrameworkScenarioSummary[]
): FrameworkComparisonDelta[] {
	const base = arms.find((arm) => arm.framework === baseFramework);
	if (!base) {
		return [];
	}
	const deltas: FrameworkComparisonDelta[] = [];
	for (const arm of arms) {
		if (arm === base) {
			continue;
		}
		for (const metric of comparedMetrics) {
			const baseMedian = base.metrics[metric]?.median ?? null;
			const headMedian = arm.metrics[metric]?.median ?? null;
			const delta =
				baseMedian !== null && headMedian !== null
					? Number((headMedian - baseMedian).toFixed(3))
					: null;
			const deltaPercent =
				delta !== null && baseMedian !== null && baseMedian > 0
					? Number(((delta / baseMedian) * 100).toFixed(2))
					: null;
			deltas.push({ delta, deltaPercent, framework: arm.framework, metric });
		}
	}
	return deltas;
};

const formatDelta = function formatDelta(
	delta: FrameworkComparisonDelta | undefined,
	unit: MetricSampleSet['unit']
): string {
	if (!delta || delta.delta === null) {
		return 'n/a';
	}
	const sign = delta.delta > 0 ? '+' : '';
	const absolute = `${sign}${formatMetric(delta.delta, unit)}`;
	if (delta.deltaPercent === null) {
		return absolute;
	}
	const percentSign = delta.deltaPercent > 0 ? '+' : '';
	return `${absolute} (${percentSign}${delta.deltaPercent.toFixed(1)}%)`;
};

const formatBoolean = function formatBoolean(value: boolean | null): string {
	if (value === null) {
		return 'n/a';
	}
	return value ? 'yes' : 'no';
};

const describeArm = function describeArm(
	arm: FrameworkScenarioSummary
): string {
	const profile = arm.metadata.profile ?? 'none';
	const latency = arm.metadata.initLatencyMs ?? 0;
	return `${arm.framework} (\`${arm.package}\`, profile ${profile}, init latency ${latency} ms)`;
};

const renderSharedTable = function renderSharedTable(
	comparison: SharedScenarioComparison,
	lines: string[]
): void {
	const { arms } = comparison;
	const others = arms.filter((arm) => arm.framework !== baseFramework);
	const header = ['Metric'];
	for (const arm of arms) {
		header.push(`${arm.framework} median`, `${arm.framework} p95`);
	}
	for (const arm of others) {
		header.push(`Δ median ${arm.framework} vs ${baseFramework}`);
	}
	lines.push(`| ${header.join(' | ')} |`);
	lines.push(
		`| --- | ${arms
			.flatMap(() => ['---:', '---:'])
			.concat(others.map(() => '---:'))
			.join(' | ')} |`
	);

	for (const metric of comparedMetrics) {
		const cells = [`\`${metric}\``];
		const unit = arms[0]?.metrics[metric]?.unit ?? 'count';
		for (const arm of arms) {
			const summary = arm.metrics[metric];
			cells.push(
				formatMetric(summary?.median ?? null, summary?.unit ?? unit),
				formatMetric(summary?.p95 ?? null, summary?.unit ?? unit)
			);
		}
		for (const arm of others) {
			cells.push(
				formatDelta(
					comparison.deltas.find(
						(delta) =>
							delta.framework === arm.framework && delta.metric === metric
					),
					unit
				)
			);
		}
		lines.push(`| ${cells.join(' | ')} |`);
	}

	const bannerCells = ['`bannerInFirstHtml`'];
	for (const arm of arms) {
		bannerCells.push(formatBoolean(arm.bannerInFirstHtml), '');
	}
	for (const _arm of others) {
		bannerCells.push('');
	}
	lines.push(`| ${bannerCells.join(' | ')} |`);
};

const renderExclusiveTable = function renderExclusiveTable(
	arm: FrameworkScenarioSummary,
	lines: string[]
): void {
	lines.push('| Metric | median | p95 |');
	lines.push('| --- | ---: | ---: |');
	for (const metric of comparedMetrics) {
		const summary = arm.metrics[metric];
		lines.push(
			`| \`${metric}\` | ${formatMetric(summary?.median ?? null, summary?.unit ?? 'count')} | ${formatMetric(summary?.p95 ?? null, summary?.unit ?? 'count')} |`
		);
	}
	lines.push(
		`| \`bannerInFirstHtml\` | ${formatBoolean(arm.bannerInFirstHtml)} | |`
	);
};

export const toMarkdownFrameworks = function toMarkdownFrameworks(
	report: FrameworksComparisonResult
): string {
	const lines = [
		'# Framework Comparison Report',
		'',
		`Generated at: ${report.generatedAt}`,
		'',
		`Results: \`${report.resultsDir}\``,
		'',
		`Base framework: \`${report.baseFramework}\`. Deltas are \`other − base\` on the median; negative is faster or smaller.`,
		'',
		`Frameworks: ${report.frameworks.map((name) => `\`${name}\``).join(', ')}`,
		'',
	];

	if (report.shared.length === 0) {
		lines.push('No scenario was run by more than one framework.', '');
	} else {
		lines.push('## Shared scenarios', '');
	}
	for (const comparison of report.shared) {
		lines.push(`### ${comparison.scenario}`, '');
		for (const arm of comparison.arms) {
			lines.push(`- ${describeArm(arm)}`);
		}
		lines.push('');
		renderSharedTable(comparison, lines);
		lines.push('');
	}

	for (const group of report.exclusive) {
		lines.push(`## Only in ${group.framework}`, '');
		for (const arm of group.scenarios) {
			lines.push(`### ${arm.scenario}`, '', `- ${describeArm(arm)}`, '');
			renderExclusiveTable(arm, lines);
			lines.push('');
		}
	}

	return `${lines.join('\n')}\n`;
};

const main = async function main() {
	const frameworks = listFrameworkDirectories(resultsDir);
	if (frameworks.length === 0) {
		throw new Error(
			`No framework result directories found under "${resultsDir}". Run the browser benches first.`
		);
	}

	const loaded = new Map(
		frameworks.map((framework) => [framework, loadFramework(framework)])
	);
	const scenarios = new Set<string>();
	for (const byScenario of loaded.values()) {
		for (const scenario of byScenario.keys()) {
			scenarios.add(scenario);
		}
	}

	const shared: SharedScenarioComparison[] = [];
	const exclusive = new Map<string, FrameworkScenarioSummary[]>();
	for (const scenario of [...scenarios].sort(compareScenarios)) {
		const arms = frameworks
			.map((framework) => loaded.get(framework)?.get(scenario))
			.filter((arm): arm is FrameworkScenarioSummary => arm !== undefined);
		if (arms.length > 1) {
			shared.push({ arms, deltas: computeDeltas(arms), scenario });
			continue;
		}
		const [only] = arms;
		if (only) {
			const list = exclusive.get(only.framework) ?? [];
			list.push(only);
			exclusive.set(only.framework, list);
		}
	}

	const report: FrameworksComparisonResult = {
		baseFramework,
		exclusive: frameworks
			.filter((framework) => exclusive.has(framework))
			.map((framework) => ({
				framework,
				scenarios: exclusive.get(framework) ?? [],
			})),
		frameworks,
		generatedAt: new Date().toISOString(),
		metrics: [...comparedMetrics],
		resultsDir,
		schemaVersion: BENCHMARK_SCHEMA_VERSION,
		shared,
	};

	writeJson(join(outputDir, 'frameworks.json'), report);
	const { writeFile } = await import('node:fs/promises');
	await writeFile(
		join(outputDir, 'frameworks.md'),
		toMarkdownFrameworks(report)
	);
	console.log(
		`Wrote ${join(outputDir, 'frameworks.md')} (${shared.length} shared scenario${shared.length === 1 ? '' : 's'}, ${report.exclusive.reduce((sum, group) => sum + group.scenarios.length, 0)} framework-only)`
	);
};

try {
	await main();
} catch (error) {
	console.error(error);
	process.exit(1);
}
