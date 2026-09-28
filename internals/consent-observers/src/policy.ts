/**
 * The policy and runtimes the observer tests share, built from public
 * exports only.
 */
import type { ExplicitChoice, KernelConfig, PolicyRule } from 'c15t';
import { createOfflineTransport, custom, resolvePolicyRules } from 'c15t';
import { createConsentRuntime } from 'c15t/runtime';
import type { ConsentRuntime } from 'c15t/runtime';

const DAY_MS = 86_400_000;

/**
 * Opt-in for measurement and marketing, with a one-day choice validity so a
 * test can step past the deadline. Every location resolves to it, which keeps
 * browser saves and server-side manifest resolution on the same fingerprint.
 */
export const OBSERVED_RULE = {
	categories: ['measurement', 'marketing'],
	id: 'observed-opt-in',
	match: { isDefault: true },
	model: 'opt-in',
	prompt: 'choice',
	scopeMode: 'strict',
	validity: { choiceDays: 1 },
} satisfies PolicyRule;

/** How long a recorded choice stays valid under {@link OBSERVED_RULE}. */
export const CHOICE_VALIDITY_MS = DAY_MS;

/** The resolved {@link OBSERVED_RULE}, as a server would prefetch it. */
export const observedPolicy = function observedPolicy() {
	return resolvePolicyRules({
		countryCode: 'DE',
		regionCode: null,
		rules: [OBSERVED_RULE],
	});
};

/** Options for {@link createObservedRuntime}. */
export interface ObservedRuntimeOptions {
	/** A choice recorded in an earlier session, restored as prefetch. */
	choice?: ExplicitChoice | null;
	/** Evaluation time of the prefetched records. */
	now?: number;
}

/**
 * A runtime that resolves {@link OBSERVED_RULE} locally, with no storage,
 * blockers or debug global, so tests observe only the kernel.
 */
export const createObservedRuntime = function createObservedRuntime(
	options: ObservedRuntimeOptions = {}
): ConsentRuntime {
	const prefetch: Omit<KernelConfig, 'transport' | 'initialDraft'> = {
		initialPolicyResolution: observedPolicy(),
	};
	if (options.choice) {
		prefetch.initialRecords = { choice: options.choice };
	}
	if (options.now !== undefined) {
		prefetch.now = options.now;
	}
	return createConsentRuntime({
		iframeBlocker: false,
		mode: custom(createOfflineTransport({ policyRules: [OBSERVED_RULE] })),
		persistence: false,
		prefetch,
		windowDebug: false,
	});
};

/**
 * Records a visitor action on a throwaway runtime and returns the stored
 * choice, the way a previous page view would have left it.
 *
 * @param action - `all` to accept, `none` to reject.
 * @returns The explicit choice the kernel recorded.
 */
export const recordChoice = async function recordChoice(
	action: 'all' | 'none'
): Promise<ExplicitChoice> {
	const runtime = createObservedRuntime();
	try {
		await runtime.kernel.commands.save(action);
		const { explicitChoice } = runtime.kernel.getSnapshot();
		if (!explicitChoice) {
			throw new Error(`save('${action}') recorded no choice`);
		}
		return explicitChoice;
	} finally {
		runtime.dispose();
	}
};
