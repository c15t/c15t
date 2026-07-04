#!/usr/bin/env node
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	evaluateBudget,
	hasFailingBudgets,
	indexMetrics,
	toMarkdownComparison,
} from './src/reporting';
import {
	BENCHMARK_SCHEMA_VERSION,
	type BenchmarkComparisonResult,
	type BenchmarkResult,
} from './src/schema';
import { listJsonFiles, readJson, writeJson } from './src/utils';

const baseDir = process.env.BENCHMARK_BASE_DIR ?? '.benchmarks/base';
const headDir = process.env.BENCHMARK_HEAD_DIR ?? '.benchmarks/head';
const outputDir = process.env.BENCHMARK_COMPARE_DIR ?? '.benchmarks/compare';
const defaultArmMapPath = join(
	dirname(fileURLToPath(import.meta.url)),
	'arm-map.json'
);
const armMapPath = process.env.BENCHMARK_ARM_MAP ?? defaultArmMapPath;

interface ArmMapFile {
	_comment?: string;
	mappings?: Record<string, string>;
}

function loadArmMap(): Map<string, string> {
	try {
		const parsed = readJson<ArmMapFile | Record<string, string>>(armMapPath);
		const mappings = 'mappings' in parsed ? parsed.mappings : parsed;
		return new Map(
			Object.entries(mappings ?? {}).filter(([key]) => key !== '_comment')
		);
	} catch {
		return new Map();
	}
}

async function main() {
	const baseResults = new Map<string, BenchmarkResult>();
	for (const file of listJsonFiles(baseDir)) {
		const result = readJson<BenchmarkResult>(file);
		baseResults.set(
			`${result.package}:${result.scenario}:${result.suite}`,
			result
		);
	}
	const armMap = loadArmMap();

	const comparison: BenchmarkComparisonResult = {
		schemaVersion: BENCHMARK_SCHEMA_VERSION,
		generatedAt: new Date().toISOString(),
		baseSha: undefined,
		headSha: undefined,
		results: [],
	};

	for (const file of listJsonFiles(headDir)) {
		const headResult = readJson<BenchmarkResult>(file);
		const key = `${headResult.package}:${headResult.scenario}:${headResult.suite}`;
		const mappedBaseKey = armMap.get(key);
		const baseResult =
			baseResults.get(key) ??
			(mappedBaseKey ? baseResults.get(mappedBaseKey) : undefined);

		const indexedHeadMetrics = indexMetrics(headResult);
		const indexedBaseMetrics = baseResult
			? indexMetrics(baseResult)
			: new Map();

		const budgets = headResult.budgetDefinitions ?? [];

		comparison.baseSha ??= baseResult?.commitSha ?? headResult.baseSha;
		comparison.headSha ??= headResult.commitSha;

		comparison.results.push({
			key,
			suite: headResult.suite,
			package: headResult.package,
			framework: headResult.framework,
			scenario: headResult.scenario,
			metrics: headResult.metrics.map((metric) => {
				const baseMetric = indexedBaseMetrics.get(metric.name);
				const delta = baseMetric
					? Number((metric.median - baseMetric.median).toFixed(3))
					: null;
				const deltaPercent =
					baseMetric && baseMetric.median > 0
						? Number(
								(
									((metric.median - baseMetric.median) / baseMetric.median) *
									100
								).toFixed(3)
							)
						: null;
				return {
					name: metric.name,
					unit: metric.unit,
					baseMedian: baseMetric?.median ?? null,
					headMedian: metric.median,
					delta,
					deltaPercent,
				};
			}),
			budgets: budgets.map((budget) =>
				evaluateBudget(
					{
						metric: budget.metric,
						comparator: budget.comparator,
						threshold: budget.threshold,
						secondaryThreshold: budget.secondaryThreshold,
						description: budget.description,
					},
					indexedHeadMetrics.get(budget.metric),
					indexedBaseMetrics.get(budget.metric)
				)
			),
			notes: headResult.notes,
		});
	}

	writeJson(join(outputDir, 'comparison.json'), comparison);
	writeJson(join(outputDir, 'comparison.md.json'), {
		markdown: toMarkdownComparison(comparison),
	});
	const { writeFile } = await import('node:fs/promises');
	await writeFile(
		join(outputDir, 'comparison.md'),
		toMarkdownComparison(comparison)
	);

	if (
		process.env.BENCHMARK_ENFORCE === 'true' &&
		hasFailingBudgets(comparison)
	) {
		throw new Error('Benchmark budget failures detected');
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
