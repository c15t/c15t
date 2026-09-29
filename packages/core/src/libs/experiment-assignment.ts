/**
 * Validation and sticky assignment for one experiment in one browser.
 *
 * Loaded on demand by {@link startExperiment}, so a site without an
 * experiment never ships it. The controller decides the arm, hands the
 * kernel a gate that checks the arm against each policy, and remembers
 * the arm under {@link EXPERIMENT_STORAGE_KEY} once the banner has shown
 * it. Nothing is written for a visitor who is never prompted, and nothing
 * is written for a host-resolved arm: the host decides that one again on
 * every visit.
 */
import type { ConsentSnapshot } from '../types';
import { deleteCookie, getRawCookieValue, setCookie } from './cookie';
import type { StorageConfig } from './cookie';
import type {
	ConsentExperiment,
	ExperimentAssignment,
	ExperimentGate,
	StartExperimentOptions,
} from './experiment';
import {
	assignExperimentVariant,
	collectExperimentDiagnostics,
	describeRejectedArms,
	experimentConfigError,
} from './experiment-engine';
import type { ExperimentDiagnostics } from './experiment-engine';
import { EXPERIMENT_STORAGE_KEY } from './storage-keys';

/** What the browser keeps between visits: the arm the banner showed. */
export interface StoredExperimentAssignment {
	/** {@link ConsentExperiment.id}. */
	id: string;
	/** The arm the banner rendered. */
	variant: string;
}

const parseStored = function parseStored(
	raw: string | null | undefined
): StoredExperimentAssignment | null {
	if (!raw) {
		return null;
	}
	try {
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null) {
			return null;
		}
		const record = parsed as Record<string, unknown>;
		// A record from an earlier build may carry `assignedBy: 'host'`; that
		// arm was the host's call, so built-in assignment does not inherit it.
		if (
			typeof record.id !== 'string' ||
			typeof record.variant !== 'string' ||
			record.assignedBy === 'host'
		) {
			return null;
		}
		return { id: record.id, variant: record.variant };
	} catch {
		return null;
	}
};

const localStorageAvailable = function localStorageAvailable(): boolean {
	try {
		return typeof localStorage !== 'undefined' && localStorage !== null;
	} catch {
		return false;
	}
};

/**
 * Read the stored arm, from localStorage first and the cookie fallback
 * second. Never throws; unreadable storage reads as no record.
 *
 * @returns The stored arm, or `null`.
 */
export const readStoredExperimentAssignment =
	function readStoredExperimentAssignment(): StoredExperimentAssignment | null {
		if (localStorageAvailable()) {
			try {
				const stored = parseStored(
					localStorage.getItem(EXPERIMENT_STORAGE_KEY)
				);
				if (stored) {
					return stored;
				}
			} catch {
				// Fall through to the cookie.
			}
		}
		const raw = getRawCookieValue(EXPERIMENT_STORAGE_KEY);
		if (!raw) {
			return null;
		}
		try {
			return parseStored(decodeURIComponent(raw));
		} catch {
			return null;
		}
	};

/**
 * Persist the arm the banner showed. Writes localStorage when available and
 * falls back to a cookie otherwise. A successful localStorage write also
 * drops any fallback cookie a previous visit left, so a later read that has
 * to fall back to the cookie cannot restore an older arm. Never throws.
 *
 * @param record - The experiment id and arm.
 * @param storageConfig - Cookie domain and path for the fallback.
 */
export const writeStoredExperimentAssignment =
	function writeStoredExperimentAssignment(
		record: StoredExperimentAssignment,
		storageConfig?: StorageConfig
	): void {
		const serialized = JSON.stringify({
			id: record.id,
			variant: record.variant,
		});
		if (localStorageAvailable()) {
			try {
				localStorage.setItem(EXPERIMENT_STORAGE_KEY, serialized);
				if (getRawCookieValue(EXPERIMENT_STORAGE_KEY)) {
					deleteCookie(EXPERIMENT_STORAGE_KEY, undefined, storageConfig);
				}
				return;
			} catch {
				// Quota or blocked storage: keep the cookie as the fallback.
			}
		}
		setCookie(
			EXPERIMENT_STORAGE_KEY,
			encodeURIComponent(serialized),
			undefined,
			storageConfig
		);
	};

const randomKey = function randomKey(): string {
	return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
		byte.toString(16).padStart(2, '0')
	).join('');
};

/** Inputs of {@link resolveExperimentAssignment}. */
export interface ResolveExperimentAssignmentInput {
	experiment: ConsentExperiment;
	/** The arm this browser stored after a previous banner showed it. */
	stored: StoredExperimentAssignment | null;
	/** The hydrated subject id, when the visitor already has one. */
	subjectId?: string | null;
	/**
	 * An arm already on the kernel for this experiment: a server prefetch
	 * that rendered it. Kept over the stored arm, because the visitor saw it.
	 */
	seeded?: ExperimentAssignment | null;
	/** Random key factory; injectable for tests. */
	createKey?: () => string;
}

/**
 * Decide the arm for this browser without touching storage.
 *
 * - A host `variant` wins.
 * - A `seeded` arm the kernel already carries is kept when it still exists.
 * - A stored arm for the same experiment id is reused when it still exists,
 *   so the banner a visitor saw stays the banner they see.
 * - Otherwise the arm is hashed from the subject id, or from a random key
 *   that is not kept: a visitor who never sees the banner is not tracked.
 *
 * @param input - The experiment, the stored arm, the seed and the subject id.
 * @returns The assignment.
 * @throws {Error} When `experiment.variant` names an undeclared arm, or a
 * supplied `weights` map reaches no arm.
 */
export const resolveExperimentAssignment = function resolveExperimentAssignment(
	input: ResolveExperimentAssignmentInput
): ExperimentAssignment {
	const { experiment, stored, seeded } = input;
	const acknowledgedDiagnostics = experiment.acknowledgeDiagnostics === true;
	if (experiment.variant !== undefined) {
		return assignExperimentVariant(experiment, '');
	}
	if (
		seeded?.id === experiment.id &&
		Object.hasOwn(experiment.variants, seeded.variant)
	) {
		return { ...seeded, acknowledgedDiagnostics };
	}
	if (
		stored?.id === experiment.id &&
		Object.hasOwn(experiment.variants, stored.variant)
	) {
		return {
			acknowledgedDiagnostics,
			assignedBy: 'c15t',
			id: stored.id,
			variant: stored.variant,
		};
	}
	return assignExperimentVariant(
		experiment,
		input.subjectId || (input.createKey ?? randomKey)()
	);
};

/** Options of {@link createExperimentController}. */
export interface ExperimentControllerOptions extends StartExperimentOptions {
	/**
	 * Receives acknowledged diagnostics and rejections, once per policy.
	 * Defaults to `console.warn` / `console.error`.
	 */
	report?: {
		warn?: (message: string, diagnostics: ExperimentDiagnostics) => void;
		error?: (error: Error) => void;
	};
	/** Random key factory; injectable for tests. */
	createKey?: () => string;
}

/** Owns one experiment's validation, assignment and storage for one kernel. */
export interface ExperimentController {
	/** The arm this browser runs, or `null` when the experiment is invalid. */
	assignment: ExperimentAssignment | null;
	/** Stop watching impressions. The arm stays on the kernel. */
	dispose: () => void;
}

/**
 * What identifies a policy for validation: the rule id and the choice
 * fingerprint, which covers the model, prompt and required actions the
 * presentation diagnostics depend on.
 */
const policyKey = function policyKey(snapshot: ConsentSnapshot): string {
	return `${snapshot.policyRule.id}\n${snapshot.evaluationPolicy.choice.fingerprint}`;
};

/**
 * Validate an experiment, assign this browser's arm and attach both to the
 * kernel.
 *
 * Nothing here throws into the page. An invalid definition logs an error
 * and runs no experiment. An arm a policy rejects is not shown under that
 * policy: the gate answers per policy, once, and the visitor sees the base
 * presentation and is left out of the experiment's records. The arm is
 * stored the first time the banner shows it, and only for built-in
 * assignment.
 *
 * @param options - Experiment, kernel, host presentation and reporting.
 * @returns The controller.
 */
export const createExperimentController = function createExperimentController(
	options: ExperimentControllerOptions
): ExperimentController {
	const { experiment, kernel } = options;
	const warn =
		options.report?.warn ??
		((message: string, diagnostics: ExperimentDiagnostics) => {
			console.warn(message, diagnostics);
		});
	const error =
		options.report?.error ??
		((failure: Error) => {
			console.error(failure);
		});

	const configError = experimentConfigError(experiment);
	if (configError) {
		error(new Error(`${configError} No experiment runs.`));
		kernel.set.experiment(null);
		return { assignment: null, dispose: () => undefined };
	}

	/** Whether each policy seen so far accepts the experiment. */
	const acceptedByPolicy = new Map<string, boolean>();
	const gate: ExperimentGate = (snapshot) => {
		const key = policyKey(snapshot);
		const known = acceptedByPolicy.get(key);
		if (known !== undefined) {
			return known;
		}
		const { policyRule } = snapshot;
		const diagnostics = collectExperimentDiagnostics(
			experiment,
			policyRule,
			options
		);
		let accepted = true;
		if (Object.keys(diagnostics).length > 0) {
			if (experiment.acknowledgeDiagnostics === true) {
				warn(
					`c15t experiment "${experiment.id}": running with acknowledged presentation diagnostics under policy "${policyRule.id}".`,
					diagnostics
				);
			} else {
				accepted = false;
				error(
					new Error(
						`${describeRejectedArms(experiment, policyRule, diagnostics)}\nVisitors under this policy see the base presentation and are not counted.`
					)
				);
			}
		}
		acceptedByPolicy.set(key, accepted);
		return accepted;
	};

	const snapshot = kernel.getSnapshot();
	const assignment = resolveExperimentAssignment({
		createKey: options.createKey,
		experiment,
		seeded: snapshot.experiment,
		stored: readStoredExperimentAssignment(),
		subjectId: snapshot.subject?.subjectId ?? null,
	});

	// Remember the arm once the banner has rendered it, so the visitor keeps
	// seeing the banner they saw. A host arm is the host's to repeat.
	let stored = false;
	const unsubscribe =
		assignment.assignedBy === 'c15t'
			? kernel.events.on('surface:shown', (event) => {
					if (stored || event.surface !== 'banner' || !event.experiment) {
						return;
					}
					stored = true;
					writeStoredExperimentAssignment(
						{ id: event.experiment.id, variant: event.experiment.variant },
						options.storageConfig
					);
				})
			: () => undefined;

	// After the listener: releasing a held prompt shows the banner in this
	// very commit, and that impression is the one to remember.
	kernel.set.experiment(assignment, gate);

	return { assignment, dispose: unsubscribe };
};
