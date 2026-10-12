/**
 * Policy evaluation cost, per rule set.
 *
 * `native/protocol/evaluation-*.json` is the rule-set corpus every implementation
 * is held to, and the contract names the TypeScript kernel as the reference when
 * two implementations disagree. Running that reference across the whole corpus
 * answers "what does a rule set cost" with one number per rule set, rather than
 * one number for whichever policy a bench happened to hard-code.
 *
 * A fixture's rule set arrives the way it arrives on device: as the resolved
 * policy inside the `/init` body. So the unit of work measured here is the same
 * one the fixture producer uses -- build the kernel, apply the init response, read
 * the snapshot back. The native rows beside this one evaluate their own fixed rule
 * set in isolation, which is a smaller span; the budgets are separate for that
 * reason.
 *
 * A fixture this file cannot drive is skipped and named in `skipped`, never
 * silently dropped, so the rule-set count stays honest.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { HydrationRecords, KernelUser } from '@c15t/core';
import { createConsentKernel, mapInitOutputToInitResponse } from '@c15t/core';

import { REPO_ROOT } from './native';

/** The `/init` response a fixture tells the client to serve. */
interface FixtureTransport {
	body: unknown;
	headers: Record<string, string>;
	status: number;
}

/** Evaluation fixture, narrowed to the fields the sweep reads. */
interface EvaluationFixture {
	id: string;
	input?: {
		hydrated?: boolean;
		now?: number;
		overrides?: { gpc?: boolean | null; language?: string | null };
		privacySignals?: { gpc?: { detected?: boolean } };
		storedRecords?: {
			choice?: unknown;
			noticeDismissal?: unknown;
			subject?: { subjectId?: string } | null;
		} | null;
		transport?: FixtureTransport;
		user?: { externalId?: string; id?: string } | null;
	};
}

/** A fixture the sweep refused to time, and why. */
export interface SkippedRuleSet {
	id: string;
	reason: string;
}

export interface PolicySweepResult {
	/** Median microseconds per rule set, over all rule sets. */
	evaluationUs: number;
	/** Rule sets measured. */
	ruleSets: number;
	/** Slowest single rule set, microseconds. */
	worstRuleSetUs: number;
	/** Names behind the numbers. */
	ruleSetIds: string[];
	/** Fixtures present but not measurable. */
	skipped: SkippedRuleSet[];
	samplesPerRuleSet: number;
	/** Set when the corpus could not be read at all. */
	unavailable?: string;
}

const FIXTURE_DIR = resolve(REPO_ROOT, 'native', 'protocol');

/** The contract declaration the kernel needs to trust a policy body. */
const CONTRACT_HEADER = 'x-c15t-policy-contract';

const median = function median(values: number[]): number {
	if (values.length === 0) {
		return 0;
	}
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
		: (sorted[middle] ?? 0);
};

/**
 * Map a fixture's stored records onto the kernel's hydration boundary.
 *
 * Absent members are left off rather than written as `undefined`, which is how the
 * kernel separates "nothing stored" from a record it must validate. The fixture
 * JSON already carries the kernel's own shapes, so each member crosses over as the
 * type the kernel declares rather than being re-modelled field by field.
 */
const hydrationFor = function hydrationFor(
	records: NonNullable<EvaluationFixture['input']>['storedRecords'],
	now: number
): HydrationRecords {
	const hydration: Record<string, unknown> = { now };

	if (records?.choice !== null && records?.choice !== undefined) {
		hydration.choice = records.choice;
	}
	if (
		records?.noticeDismissal !== null &&
		records?.noticeDismissal !== undefined
	) {
		hydration.noticeDismissal = records.noticeDismissal;
	}
	if (records?.subject !== null && records?.subject !== undefined) {
		hydration.subject = records.subject;
	}

	return hydration as unknown as HydrationRecords;
};

/** Read the evaluation corpus, tolerating a missing directory. */
const readFixtures = function readFixtures(): {
	fixtures: { fixture: EvaluationFixture; name: string }[];
	readErrors: SkippedRuleSet[];
} {
	const files = readdirSync(FIXTURE_DIR)
		.filter((name) => name.startsWith('evaluation-') && name.endsWith('.json'))
		.sort();

	const fixtures: { fixture: EvaluationFixture; name: string }[] = [];
	const readErrors: SkippedRuleSet[] = [];

	for (const name of files) {
		try {
			fixtures.push({
				fixture: JSON.parse(
					readFileSync(join(FIXTURE_DIR, name), 'utf8')
				) as EvaluationFixture,
				name,
			});
		} catch (error) {
			readErrors.push({
				id: name,
				reason: `unreadable fixture: ${String(error)}`,
			});
		}
	}

	return { fixtures, readErrors };
};

/**
 * Check that a fixture carries enough to drive the kernel.
 *
 * @param fixture - The parsed fixture.
 * @returns `null` when it can be driven, otherwise the reason it cannot.
 */
export const skipReason = function skipReason(
	fixture: EvaluationFixture,
	name: string
): string | null {
	const { input } = fixture;
	if (!input) {
		return `${name || fixture.id} has no "input" object`;
	}
	const { transport } = input;
	if (!transport || typeof transport !== 'object') {
		return `${fixture.id ?? name} has no "input.transport" to serve`;
	}
	if (!transport.body) {
		return `${fixture.id ?? name} has an empty "input.transport.body"`;
	}
	if (typeof transport.headers?.[CONTRACT_HEADER] !== 'string') {
		return `${fixture.id ?? name} is missing the "${CONTRACT_HEADER}" response header`;
	}
	if (typeof input.now !== 'number') {
		return `${fixture.id ?? name} has no numeric "input.now"`;
	}
	return null;
};

/**
 * Build the kernel the fixture describes, serving its own init response.
 *
 * This mirrors `runFixture` in the producer script so the sweep times the same
 * path that generated `expected`, including the contract-declaration header.
 */
const kernelFor = function kernelFor(fixture: EvaluationFixture) {
	const input = fixture.input as NonNullable<EvaluationFixture['input']>;
	const transport = input.transport as FixtureTransport;
	const response = mapInitOutputToInitResponse(
		transport.body as Parameters<typeof mapInitOutputToInitResponse>[0],
		{},
		{ producerContract: Number(transport.headers[CONTRACT_HEADER]) }
	);

	const overrides: Record<string, unknown> = {
		language: input.overrides?.language ?? 'en',
	};
	// An override the fixture never carried must stay absent: the kernel treats a
	// present-but-null override as a value the app pinned.
	if (input.overrides?.gpc !== null && input.overrides?.gpc !== undefined) {
		overrides.gpc = input.overrides.gpc;
	}

	return createConsentKernel({
		initialOverrides: overrides,
		initialPolicyPending: true,
		initialPrivacySignals: {
			gpc: input.privacySignals?.gpc?.detected ?? false,
		},
		initialRecords: hydrationFor(input.storedRecords, input.now as number),
		initialUser: (input.user ?? undefined) as KernelUser | undefined,
		now: input.now as number,
		transport: {
			init: () => Promise.resolve(response),
			save: (payload: { subjectId?: string }) =>
				Promise.resolve({
					ok: true as const,
					subjectId: payload.subjectId ?? 'sub-bench-1',
				}),
		},
	});
};

/**
 * Evaluate every rule set repeatedly and report the medians.
 *
 * @param warmup - Iterations discarded per rule set.
 * @param iterations - Iterations kept per rule set.
 * @returns The per-rule-set numbers, plus how many rule sets were covered.
 */
export const measurePolicySweep = async function measurePolicySweep(
	warmup: number,
	iterations: number
): Promise<PolicySweepResult> {
	let corpus: ReturnType<typeof readFixtures>;
	try {
		corpus = readFixtures();
	} catch (error) {
		return {
			evaluationUs: 0,
			ruleSetIds: [],
			ruleSets: 0,
			samplesPerRuleSet: 0,
			skipped: [],
			unavailable: `no evaluation corpus under ${FIXTURE_DIR}: ${String(error)}`,
			worstRuleSetUs: 0,
		};
	}

	const skipped: SkippedRuleSet[] = [...corpus.readErrors];
	const measurable: EvaluationFixture[] = [];

	for (const { fixture, name } of corpus.fixtures) {
		const reason = skipReason(fixture, name);
		if (reason) {
			skipped.push({ id: fixture.id ?? name, reason });
		} else {
			measurable.push(fixture);
		}
	}

	const empty: PolicySweepResult = {
		evaluationUs: 0,
		ruleSetIds: [],
		ruleSets: 0,
		samplesPerRuleSet: 0,
		skipped,
		worstRuleSetUs: 0,
	};

	if (measurable.length === 0) {
		return {
			...empty,
			unavailable:
				skipped.length > 0
					? `no evaluation fixture could be driven: ${skipped[0]?.reason}`
					: `no evaluation-*.json fixtures under ${FIXTURE_DIR}`,
		};
	}

	const allSamples: number[] = [];
	const perRuleSet: number[] = [];

	for (const fixture of measurable) {
		const samples: number[] = [];
		try {
			for (let index = 0; index < warmup + iterations; index += 1) {
				const startedAt = performance.now();
				const kernel = kernelFor(fixture);
				// One kernel per sample, awaited per sample: the number is the latency
				// of applying one rule set, so the samples cannot run concurrently.
				// eslint-disable-next-line no-await-in-loop
				await kernel.commands.init();
				kernel.getSnapshot();
				const elapsed = (performance.now() - startedAt) * 1000;
				kernel.dispose();
				if (index >= warmup) {
					samples.push(elapsed);
				}
			}
		} catch (error) {
			skipped.push({
				id: fixture.id,
				reason: `kernel rejected this fixture: ${String(error)}`,
			});
			continue;
		}

		if (samples.length === 0) {
			skipped.push({ id: fixture.id, reason: 'no measured samples' });
			continue;
		}

		perRuleSet.push(median(samples));
		allSamples.push(...samples);
	}

	if (perRuleSet.length === 0) {
		return {
			...empty,
			unavailable: `every evaluation fixture was rejected: ${skipped[0]?.reason ?? 'unknown'}`,
		};
	}

	return {
		evaluationUs: Number(median(allSamples).toFixed(3)),
		ruleSetIds: measurable
			.filter((fixture) => !skipped.some((entry) => entry.id === fixture.id))
			.map((fixture) => fixture.id),
		ruleSets: perRuleSet.length,
		samplesPerRuleSet: iterations,
		skipped,
		worstRuleSetUs: Number(Math.max(...perRuleSet).toFixed(3)),
	};
};
