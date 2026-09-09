#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import { scriptLifecycleBudgetsForMetric } from '@c15t/benchmarking/budgets';
import { BENCHMARK_SCHEMA_VERSION } from '@c15t/benchmarking/schema';
import type { BenchmarkResult } from '@c15t/benchmarking/schema';
import {
	getEnvironment,
	safeBaseSha,
	safeCommitSha,
	safeGitDirty,
	summarizeMetric,
	writeJson,
} from '@c15t/benchmarking/utils';
import { chromium } from 'playwright';
import type * as PlaywrightTypes from 'playwright';

import { allScenarioConfigs } from '../app/_bench/fixtures';
import type { ScriptLifecycleScenarioConfig } from '../app/_bench/fixtures';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const _createDeferredPromise = function _createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
};

const createVoidDeferredPromise = function createVoidDeferredPromise(
	run: (
		resolve: () => void,
		reject: DeferredPromise<undefined>['reject']
	) => void
): Promise<void> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<undefined>();
	run(() => deferred.resolve(undefined), deferred.reject);
	return deferred.promise;
};

const HOST = '127.0.0.1';
const PORT = 4313;
const BASE_URL = `http://${HOST}:${PORT}`;
const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const buildIdPath = join(appDir, '.next', 'BUILD_ID');
const outputDir =
	process.env.BENCH_OUTPUT_DIR ?? '.benchmarks/script-lifecycle';
const iterations = Number(process.env.BENCH_ITERATIONS ?? '7');
const warmupIterations = Number(process.env.BENCH_WARMUP_ITERATIONS ?? '1');
const expectedServerShutdownCodes = new Set([0, 137, 143]);
const expectedServerShutdownSignals = new Set(['SIGTERM', 'SIGKILL']);

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

const waitForServer = async function waitForServer() {
	for (let attempt = 0; attempt < 120; attempt += 1) {
		try {
			// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
			const response = await fetch(`${BASE_URL}/`);
			if (response.ok) {
				return;
			}
		} catch {
			// Ignore transient failures while polling or cleaning up.
		}
		// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
		await sleep(500);
	}

	throw new Error('Timed out waiting for script lifecycle bench server');
};

const runCommand = async function runCommand(args: string[], label: string) {
	return await createVoidDeferredPromise((resolvePromise, rejectPromise) => {
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
};

const ensureBuild = async function ensureBuild() {
	if (existsSync(buildIdPath)) {
		return;
	}

	await runCommand(['run', 'build'], 'script lifecycle benchmark build');
};

const sortIds = function sortIds(ids: string[]): string[] {
	return [...ids].sort((left, right) => left.localeCompare(right));
};

const assertIds = function assertIds(
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
};

const assertDomPresence = function assertDomPresence(
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
};

const assertScenarioInvariants = function assertScenarioInvariants(
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
};

const collectScenarioSample = async function collectScenarioSample(
	page: PlaywrightTypes.Page,
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
};

const run = async function run() {
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

	let serverFailure: Error | null = null;
	try {
		await waitForServer();
		const browser = await chromium.launch({ headless: true });

		await allScenarioConfigs.reduce<Promise<void>>(
			async (previousScenario, config) => {
				await previousScenario;
				const durationSamples: number[] = [];
				const loadedScriptCounts: number[] = [];
				const unloadedScriptCounts: number[] = [];
				const retainedDomScriptCounts: number[] = [];
				const callbackLoadCounts: number[] = [];
				const callbackConsentChangeCounts: number[] = [];
				const errorCounts: number[] = [];

				const iterationIndexes = Array.from(
					{ length: warmupIterations + iterations },
					(_, index) => index
				);
				await iterationIndexes.reduce<Promise<void>>(
					async (previousIteration, index) => {
						await previousIteration;
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
								Object.values(sample.state.domPresenceById).filter(Boolean)
									.length
							);
							callbackLoadCounts.push(
								sample.state.loadEventCounts['fixture-callback-only'] ?? 0
							);
							callbackConsentChangeCounts.push(
								sample.state.consentChangeEventCounts[
									'fixture-callback-only'
								] ?? 0
							);
							errorCounts.push(sample.state.errors.length);
						}

						await context.close();
					},
					Promise.resolve()
				);

				const result: BenchmarkResult = {
					baseSha: safeBaseSha(),
					budgetDefinitions: scriptLifecycleBudgetsForMetric(config.metric),
					budgets: [],
					commitSha: safeCommitSha(),
					environment: getEnvironment(browser.version()),
					fixture: {
						consentCount: 5,
						localeCount: 1,
						name: config.name,
						notes: [
							'Local deterministic script routes only.',
							'Measures consent-driven script lifecycle rather than remote CDN latency.',
						],
						scriptCount: config.scriptIds.length,
						themeComplexity: 'minimal',
					},
					framework: 'core',
					metadata: {
						gitDirty: safeGitDirty(),
						iterations,
						warmupIterations,
					},
					metrics: [
						summarizeMetric(config.metric, 'ms', durationSamples),
						summarizeMetric('loadedScriptCount', 'count', loadedScriptCounts),
						summarizeMetric(
							'unloadedScriptCount',
							'count',
							unloadedScriptCounts
						),
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
					notes: [
						'Script lifecycle benchmark uses local fixture scripts and predicate-based completion checks.',
						'IAB-gated script lifecycle scenarios are intentionally excluded from v1.',
					],
					package: '@c15t/script-lifecycle-bench',
					runtime: 'playwright',
					scenario: config.name,
					schemaVersion: BENCHMARK_SCHEMA_VERSION,
					suite: 'script-lifecycle',
					timestamp: new Date().toISOString(),
				};

				writeJson(join(outputDir, `${config.name}.json`), result);
			},
			Promise.resolve()
		);

		await browser.close();
	} finally {
		server.kill('SIGTERM');
		await sleep(500);
		if (!server.killed) {
			server.kill('SIGKILL');
		}
		if (
			server.exitCode !== null &&
			server.exitCode !== undefined &&
			!expectedServerShutdownCodes.has(server.exitCode)
		) {
			serverFailure = new Error(
				`${logs || 'Script lifecycle bench server failed'}\nUnexpected server exit code: ${server.exitCode}`
			);
		} else if (
			server.exitCode === null ||
			(server.exitCode === undefined &&
				server.signalCode !== null &&
				server.signalCode !== undefined &&
				!expectedServerShutdownSignals.has(server.signalCode))
		) {
			serverFailure = new Error(
				`${logs || 'Script lifecycle bench server failed'}\nUnexpected server signal: ${server.signalCode}`
			);
		}
	}

	if (serverFailure) {
		throw serverFailure;
	}
};

try {
	await run();
} catch (error) {
	console.error(error);
	process.exit(1);
}
