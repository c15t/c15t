#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import {
	BENCHMARK_SCHEMA_VERSION,
	type BenchmarkResult,
	getEnvironment,
	safeBaseSha,
	safeCommitSha,
	scriptLifecycleBudgets,
	summarizeMetric,
	writeJson,
} from '@c15t/benchmarking';
import { chromium } from 'playwright';
import {
	allScenarioConfigs,
	type ScriptLifecycleScenarioConfig,
} from '../app/_bench/fixtures';

const HOST = '127.0.0.1';
const PORT = 4313;
const BASE_URL = `http://${HOST}:${PORT}`;
const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const buildIdPath = join(appDir, '.next', 'BUILD_ID');
const outputDir =
	process.env.BENCH_OUTPUT_DIR ?? '.benchmarks/script-lifecycle';
const iterations = Number(process.env.BENCH_ITERATIONS ?? '7');
const warmupIterations = Number(process.env.BENCH_WARMUP_ITERATIONS ?? '1');

interface SerializableScriptBenchState {
	scenario: string;
	startedAtMs: number;
	consentSaveCount: number;
	activeUI: string;
	loadedIds: string[];
	loadEventCounts: Record<string, number>;
	beforeLoadEventCounts: Record<string, number>;
	consentChangeEventCounts: Record<string, number>;
	domPresenceById: Record<string, boolean>;
	reloadCount: number;
	errors: string[];
	scriptEvents: Record<string, number>;
	completionMarkers: Record<string, boolean>;
}

async function waitForServer() {
	for (let attempt = 0; attempt < 120; attempt += 1) {
		try {
			const response = await fetch(`${BASE_URL}/`);
			if (response.ok) {
				return;
			}
		} catch {}
		await sleep(500);
	}

	throw new Error('Timed out waiting for script lifecycle bench server');
}

async function runCommand(args: string[], label: string) {
	return await new Promise<void>((resolvePromise, rejectPromise) => {
		const command = spawn('bun', args, {
			cwd: appDir,
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		let logs = '';
		command.stdout.on('data', (chunk) => {
			logs += String(chunk);
		});
		command.stderr.on('data', (chunk) => {
			logs += String(chunk);
		});

		command.on('exit', (code) => {
			if (code === 0) {
				resolvePromise();
				return;
			}

			rejectPromise(
				new Error(logs || `bun ${args.join(' ')} failed while running ${label}`)
			);
		});
		command.on('error', rejectPromise);
	});
}

async function ensureBuild() {
	if (existsSync(buildIdPath)) {
		return;
	}

	await runCommand(['run', 'build'], 'script lifecycle benchmark build');
}

function sortIds(ids: string[]): string[] {
	return [...ids].sort((left, right) => left.localeCompare(right));
}

function assertIds(
	label: string,
	actual: string[],
	expected: string[],
	scenario: string
) {
	const left = sortIds(actual);
	const right = sortIds(expected);
	if (
		left.length !== right.length ||
		left.some((value, index) => value !== right[index])
	) {
		throw new Error(
			`${scenario}: ${label} mismatch. Expected ${right.join(', ') || '(none)'} but saw ${left.join(', ') || '(none)'}`
		);
	}
}

function assertDomPresence(
	state: SerializableScriptBenchState,
	config: ScriptLifecycleScenarioConfig
) {
	for (const id of config.scriptIds) {
		const actual = state.domPresenceById[id] ?? false;
		const expected = config.expectedFinalDomIds.includes(id);
		if (actual !== expected) {
			throw new Error(
				`${config.name}: DOM presence mismatch for ${id}. Expected ${expected} but saw ${actual}`
			);
		}
	}
}

function assertScenarioInvariants(
	state: SerializableScriptBenchState,
	config: ScriptLifecycleScenarioConfig
) {
	if (state.errors.length > 0) {
		throw new Error(
			`${config.name}: benchmark reported errors: ${state.errors.join('; ')}`
		);
	}

	if (!state.completionMarkers.initialReady) {
		throw new Error(`${config.name}: initialReady marker was never set`);
	}

	if (!state.completionMarkers[config.completionMarker]) {
		throw new Error(
			`${config.name}: completion marker "${config.completionMarker}" was never set`
		);
	}

	assertIds(
		'loadedIds',
		state.loadedIds,
		config.expectedFinalLoadedIds,
		config.name
	);
	assertDomPresence(state, config);

	if (config.name === 'reload-single') {
		const reloadTarget = config.reloadTargetId ?? 'fixture-standard-head';
		if ((state.loadEventCounts[reloadTarget] ?? 0) < 2) {
			throw new Error(
				`${config.name}: reload target did not report a second load event`
			);
		}
		if (state.reloadCount < 1) {
			throw new Error(`${config.name}: reload count did not increment`);
		}
	}

	if (config.name === 'callback-only-toggle') {
		if ((state.beforeLoadEventCounts['fixture-callback-only'] ?? 0) < 1) {
			throw new Error(
				`${config.name}: callback-only script never fired onBeforeLoad`
			);
		}
		if ((state.loadEventCounts['fixture-callback-only'] ?? 0) < 1) {
			throw new Error(
				`${config.name}: callback-only script never fired onLoad`
			);
		}
		if ((state.domPresenceById['fixture-callback-only'] ?? false) !== false) {
			throw new Error(
				`${config.name}: callback-only script unexpectedly created a DOM node`
			);
		}
	}
}

async function collectScenarioSample(
	page: import('playwright').Page,
	config: ScriptLifecycleScenarioConfig
) {
	await page.goto(`/?scenario=${config.name}`);
	await page.waitForFunction(
		(targetScenario) => {
			const state = window.__c15tScriptBench;
			return (
				!!state &&
				state.scenario === targetScenario &&
				state.completionMarkers.initialReady === true
			);
		},
		config.name,
		{ timeout: 30_000 }
	);

	const startedAt = performance.now();
	await page.click('#run-scenario-action');
	await page.waitForFunction(
		(marker) => {
			const state = window.__c15tScriptBench;
			return !!state && state.completionMarkers[marker] === true;
		},
		config.completionMarker,
		{ timeout: 30_000 }
	);
	const durationMs = performance.now() - startedAt;

	const state = await page.evaluate(() => {
		const current = window.__c15tScriptBench;
		if (!current) {
			return null;
		}
		return JSON.parse(JSON.stringify(current));
	});

	if (!state) {
		throw new Error(`${config.name}: missing benchmark state`);
	}

	const typedState = state as SerializableScriptBenchState;
	assertScenarioInvariants(typedState, config);

	return {
		durationMs,
		state: typedState,
	};
}

async function run() {
	await ensureBuild();

	const server = spawn(
		'bun',
		['run', 'next', 'start', '-H', HOST, '-p', `${PORT}`],
		{
			cwd: appDir,
			stdio: ['ignore', 'pipe', 'pipe'],
		}
	);

	let logs = '';
	server.stdout.on('data', (chunk) => {
		logs += String(chunk);
	});
	server.stderr.on('data', (chunk) => {
		logs += String(chunk);
	});

	try {
		await waitForServer();
		const browser = await chromium.launch({ headless: true });

		for (const config of allScenarioConfigs) {
			const durationSamples: number[] = [];
			const loadedScriptCounts: number[] = [];
			const unloadedScriptCounts: number[] = [];
			const retainedDomScriptCounts: number[] = [];
			const callbackLoadCounts: number[] = [];
			const callbackConsentChangeCounts: number[] = [];
			const errorCounts: number[] = [];

			for (let index = 0; index < warmupIterations + iterations; index += 1) {
				const context = await browser.newContext({ baseURL: BASE_URL });
				const page = await context.newPage();

				const sample = await collectScenarioSample(page, config);

				if (index >= warmupIterations) {
					durationSamples.push(sample.durationMs);
					loadedScriptCounts.push(sample.state.loadedIds.length);
					unloadedScriptCounts.push(
						config.scriptIds.length - sample.state.loadedIds.length
					);
					retainedDomScriptCounts.push(
						Object.values(sample.state.domPresenceById).filter(Boolean).length
					);
					callbackLoadCounts.push(
						sample.state.loadEventCounts['fixture-callback-only'] ?? 0
					);
					callbackConsentChangeCounts.push(
						sample.state.consentChangeEventCounts['fixture-callback-only'] ?? 0
					);
					errorCounts.push(sample.state.errors.length);
				}

				await context.close();
			}

			const result: BenchmarkResult = {
				schemaVersion: BENCHMARK_SCHEMA_VERSION,
				suite: 'script-lifecycle',
				package: '@c15t/script-lifecycle-bench',
				framework: 'core',
				runtime: 'playwright',
				scenario: config.name,
				commitSha: safeCommitSha(),
				baseSha: safeBaseSha(),
				timestamp: new Date().toISOString(),
				environment: getEnvironment(browser.version()),
				fixture: {
					name: config.name,
					consentCount: 5,
					scriptCount: config.scriptIds.length,
					localeCount: 1,
					themeComplexity: 'minimal',
					notes: [
						'Local deterministic script routes only.',
						'Measures consent-driven script lifecycle rather than remote CDN latency.',
					],
				},
				metrics: [
					summarizeMetric(config.metric, 'ms', durationSamples),
					summarizeMetric('loadedScriptCount', 'count', loadedScriptCounts),
					summarizeMetric('unloadedScriptCount', 'count', unloadedScriptCounts),
					summarizeMetric(
						'retainedDomScriptCount',
						'count',
						retainedDomScriptCounts
					),
					summarizeMetric('callbackLoadCount', 'count', callbackLoadCounts),
					summarizeMetric(
						'callbackConsentChangeCount',
						'count',
						callbackConsentChangeCounts
					),
					summarizeMetric('errorCount', 'count', errorCounts),
				],
				budgetDefinitions: scriptLifecycleBudgets.filter((budget) =>
					[config.metric, 'errorCount'].includes(budget.metric)
				),
				budgets: [],
				notes: [
					'Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.',
					'IAB-gated script lifecycle scenarios are intentionally excluded from v1.',
				],
			};

			writeJson(join(outputDir, `${config.name}.json`), result);
		}

		await browser.close();
	} finally {
		server.kill('SIGTERM');
		await sleep(500);
		if (!server.killed) {
			server.kill('SIGKILL');
		}
		if (server.exitCode && server.exitCode !== 0) {
			throw new Error(logs || 'Script lifecycle bench server failed');
		}
	}
}

run().catch((error) => {
	console.error(error);
	process.exit(1);
});
