#!/usr/bin/env node
/**
 * Policy wire payload and synchronous resolution benchmark.
 *
 * For each fixed policy fixture (see `@c15t/benchmarking/policy-fixtures`)
 * this records what the installed source emits and how long the
 * synchronous paths take:
 *
 * - manifest JSON, gzip, and brotli bytes as produced by
 *   `buildConsentManifestFromConfig`;
 * - init JSON, gzip, and brotli bytes as produced by
 *   `resolveInitFromManifest` for the fixture's request inputs;
 * - synchronous policy resolution time through the installed resolver;
 * - `resolveInitFromManifest` time;
 * - kernel construction plus `commands.init()` time with the fixture's
 *   init response, which is the prompt-derivation path adapters run.
 *
 * The harness asserts that resolution matched a policy so a fixture can
 * never degrade into measuring the empty fallback.
 */
import { join } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';

import { policyRuntimeBudgetsForFixture } from '@c15t/benchmarking/budgets';
import {
	createSyncPolicyResolution,
	matchedPolicyId,
	policyBenchFixtures,
	policyBenchFixtureNames,
	resolvePolicyBenchPack,
} from '@c15t/benchmarking/policy-fixtures';
import type { PolicyBenchFixture } from '@c15t/benchmarking/policy-fixtures';
import { BENCHMARK_SCHEMA_VERSION } from '@c15t/benchmarking/schema';
import type { BenchmarkResult } from '@c15t/benchmarking/schema';
import {
	getEnvironment,
	measureAsyncLoop,
	measureLoop,
	safeBaseSha,
	safeCommitSha,
	safeGitDirty,
	summarizeMetric,
	writeJson,
} from '@c15t/benchmarking/utils';
import { createConsentKernel, mapInitOutputToInitResponse } from '@c15t/core';
import type { InitResponse, KernelTransport } from '@c15t/core';
import {
	buildConsentManifestFromConfig,
	resolveInitFromManifest,
} from '@c15t/schema/types';
import type {
	InitOutput,
	ResolveInitFromManifestOptions,
} from '@c15t/schema/types';
import { enTranslations } from '@c15t/translations';

const ITERATIONS = Number(process.env.BENCH_ITERATIONS ?? '500');
const WARMUP = Number(process.env.BENCH_WARMUP_ITERATIONS ?? '50');
const outputDir = process.env.BENCH_OUTPUT_DIR ?? '.benchmarks/policy-runtime';

const byteSizes = function byteSizes(value: unknown) {
	const json = JSON.stringify(value);
	const buffer = Buffer.from(json, 'utf8');
	return {
		brotli: brotliCompressSync(buffer).byteLength,
		gzip: gzipSync(buffer).byteLength,
		json: buffer.byteLength,
	};
};

const warmed = function warmed(fn: () => void): number[] {
	measureLoop(WARMUP, fn);
	return measureLoop(ITERATIONS, fn);
};

const warmedAsync = async function warmedAsync(
	fn: () => Promise<void>
): Promise<number[]> {
	await measureAsyncLoop(WARMUP, fn);
	return await measureAsyncLoop(ITERATIONS, fn);
};

const createInitTransport = function createInitTransport(
	response: InitResponse
): KernelTransport {
	return {
		init: () => Promise.resolve(response),
		save: () => Promise.resolve({ ok: true }),
	} as unknown as KernelTransport;
};

const measurePolicyOperations = async (response: InitResponse) => {
	const { createPolicyOperations } = await import('./policy-operations');
	const metrics = [];
	for (const [name, operation] of Object.entries(
		createPolicyOperations(response)
	)) {
		// oxlint-disable-next-line no-await-in-loop -- Timed operations must never overlap.
		const samples = await warmedAsync(operation);
		metrics.push(summarizeMetric(name, 'us', samples));
	}
	return metrics;
};

const runFixture = async function runFixture(
	fixture: PolicyBenchFixture
): Promise<void> {
	const resolved = resolvePolicyBenchPack(fixture);
	// Only the default locale is supplied so the measurement does not pay for
	// every bundled language; the type demands the full set, the resolver
	// only needs the requested one.
	const baseTranslations = {
		en: enTranslations,
	} as unknown as ResolveInitFromManifestOptions['baseTranslations'];

	// Manifest as the server would publish it for this deployment.
	const manifestBuildSamples = await warmedAsync(async () => {
		await buildConsentManifestFromConfig(resolved.manifestConfig);
	});
	const manifest = await buildConsentManifestFromConfig(
		resolved.manifestConfig
	);
	const manifestBytes = byteSizes(manifest);

	// Init response as `/init` (or a same-origin manifest route) would emit.
	const resolveInit = () =>
		resolveInitFromManifest(
			manifest,
			{
				country: fixture.inputs.country,
				gpc: fixture.inputs.gpc,
				language: fixture.inputs.language,
				region: fixture.inputs.region,
			},
			{ baseTranslations }
		);
	const init: InitOutput = resolveInit();
	const initBytes = byteSizes(init);
	const initResolution =
		(init as Record<string, unknown>).policyResolution ??
		(init as Record<string, unknown>).policyDecision;
	const initPolicyId = matchedPolicyId(initResolution);
	const expectedRule =
		resolved.pack[fixture.presets.indexOf(fixture.expectedPreset)];
	const expectedPolicyId =
		expectedRule && typeof expectedRule === 'object' && 'id' in expectedRule
			? expectedRule.id
			: null;
	if (!initPolicyId || initPolicyId !== expectedPolicyId) {
		throw new Error(
			`${fixture.name}: resolveInitFromManifest did not match a policy (keys: ${Object.keys(init).join(', ')})`
		);
	}
	const resolveInitSamples = warmed(() => {
		resolveInit();
	});

	// Synchronous policy resolution over the pack.
	const syncResolution = createSyncPolicyResolution(fixture, resolved);
	const syncPolicyId = matchedPolicyId(syncResolution.run());
	if (!syncPolicyId || syncPolicyId !== expectedPolicyId) {
		throw new Error(
			`${fixture.name}: ${syncResolution.resolver} did not match a policy`
		);
	}
	const resolvePolicySamples = warmed(() => {
		syncResolution.run();
	});

	// Kernel init: construct + apply the init response, which derives the
	// prompt the adapter renders.
	const initResponse = mapInitOutputToInitResponse(init, {});
	const transport = createInitTransport(initResponse);
	const probeKernel = createConsentKernel({
		initialOverrides: {
			country: fixture.inputs.country ?? undefined,
			language: fixture.inputs.language,
			region: fixture.inputs.region ?? undefined,
		},
		transport,
	});
	const probeInit = await probeKernel.commands.init();
	if (!probeInit.ok) {
		throw new Error(`${fixture.name}: kernel init failed`);
	}
	const probeSnapshot = probeKernel.getSnapshot() as unknown as Record<
		string,
		unknown
	>;
	probeKernel.dispose();
	const kernelInitSamples = await warmedAsync(async () => {
		const kernel = createConsentKernel({
			initialOverrides: {
				country: fixture.inputs.country ?? undefined,
				language: fixture.inputs.language,
				region: fixture.inputs.region ?? undefined,
			},
			transport,
		});
		await kernel.commands.init();
		kernel.dispose();
	});

	const promptRequirement = probeSnapshot.promptRequirement as
		| { kind?: string; reason?: string }
		| undefined;

	const operationMetrics =
		resolved.family === 'policy-rules'
			? await measurePolicyOperations(initResponse)
			: [];

	const result: BenchmarkResult = {
		baseSha: safeBaseSha(),
		budgetDefinitions: policyRuntimeBudgetsForFixture(fixture),
		budgets: [],
		commitSha: safeCommitSha(),
		environment: getEnvironment(),
		fixture: {
			consentCount: 5,
			localeCount: 1,
			name: fixture.name,
			notes: [fixture.description],
			scriptCount: 0,
			themeComplexity: 'minimal',
		},
		framework: 'core',
		metadata: {
			activeUI:
				typeof probeSnapshot.activeUI === 'string'
					? probeSnapshot.activeUI
					: null,
			contractFamily: resolved.family,
			gitDirty: safeGitDirty(),
			initKeys: Object.keys(init).sort(),
			initPolicyId,
			iterations: ITERATIONS,
			manifestSchemaVersion:
				typeof manifest.schemaVersion === 'number'
					? manifest.schemaVersion
					: null,
			packSize: resolved.pack.length,
			presets: resolved.presetNames,
			promptRequirement: promptRequirement?.kind ?? null,
			promptRequirementReason: promptRequirement?.reason ?? null,
			syncPolicyId,
			syncResolver: syncResolution.resolver,
			warmupIterations: WARMUP,
		},
		metrics: [
			...operationMetrics,
			summarizeMetric('manifestJsonBytes', 'bytes', [manifestBytes.json]),
			summarizeMetric('manifestGzipBytes', 'bytes', [manifestBytes.gzip]),
			summarizeMetric('manifestBrotliBytes', 'bytes', [manifestBytes.brotli]),
			summarizeMetric('initJsonBytes', 'bytes', [initBytes.json]),
			summarizeMetric('initGzipBytes', 'bytes', [initBytes.gzip]),
			summarizeMetric('initBrotliBytes', 'bytes', [initBytes.brotli]),
			summarizeMetric('manifestBuildUs', 'us', manifestBuildSamples),
			summarizeMetric('resolvePolicyUs', 'us', resolvePolicySamples),
			summarizeMetric('resolveInitUs', 'us', resolveInitSamples),
			summarizeMetric('kernelInitUs', 'us', kernelInitSamples),
		],
		notes: [
			'Payload bytes are measured on the JSON the installed schema package emits for a fixed preset deployment; nothing is hand-written.',
			'resolvePolicyUs uses the installed synchronous resolver; resolveInitUs and kernelInitUs cover manifest init resolution and kernel prompt derivation.',
			`Sync resolver: ${syncResolution.resolver}; contract family: ${resolved.family}.`,
		],
		package: '@c15t/core-benchmarks',
		runtime: process.versions.bun ? 'bun' : 'node',
		scenario: fixture.name,
		schemaVersion: BENCHMARK_SCHEMA_VERSION,
		suite: 'policy-runtime',
		timestamp: new Date().toISOString(),
	};

	writeJson(join(outputDir, `${fixture.name}.json`), result);
};

await policyBenchFixtureNames.reduce(async (previous, name) => {
	await previous;
	await runFixture(policyBenchFixtures[name]);
}, Promise.resolve());
