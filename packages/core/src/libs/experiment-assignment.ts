/**
 * Sticky experiment assignment for a browser.
 *
 * The kernel is pure, so the arm a visitor runs is decided here, in the
 * runtime layer, and stored under {@link EXPERIMENT_STORAGE_KEY} so the
 * same browser lands in the same arm on every visit. A host-resolved
 * `variant` always wins and overwrites the stored arm; built-in assignment
 * reuses the stored arm for the same experiment id and otherwise hashes a
 * stable key: the hydrated subject id when one exists, else a random key.
 * Only the random key is kept in the record; the subject id is never
 * written a second time.
 */
import type { ConsentKernel, ConsentSnapshot } from '../types';
import { deleteCookie, getRawCookieValue, setCookie } from './cookie';
import type { StorageConfig } from './cookie';
import { assignExperimentVariant, validateExperiment } from './experiment';
import type {
	ConsentExperiment,
	ExperimentAssignment,
	ExperimentDiagnostics,
	ValidateExperimentOptions,
} from './experiment';
import { isExperimentAssignment } from './experiment-record';

/** localStorage key (and cookie name fallback) of the stored assignment. */
export const EXPERIMENT_STORAGE_KEY = 'c15t-experiment-v1';

/** What the browser keeps between visits. */
export interface StoredExperimentAssignment extends ExperimentAssignment {
	/**
	 * The random key built-in assignment hashed, kept so a removed arm
	 * re-assigns the same way. Absent for a host-resolved arm and when the
	 * subject id was the key: that id lives in the consent record already.
	 */
	key?: string;
}

const isStoredAssignment = function isStoredAssignment(
	value: unknown
): value is StoredExperimentAssignment {
	if (!isExperimentAssignment(value)) {
		return false;
	}
	const { key } = value as StoredExperimentAssignment;
	return key === undefined || typeof key === 'string';
};

const parseStored = function parseStored(
	raw: string | null | undefined
): StoredExperimentAssignment | null {
	if (!raw) {
		return null;
	}
	try {
		const parsed: unknown = JSON.parse(raw);
		return isStoredAssignment(parsed) ? parsed : null;
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
 * Read the stored assignment, from localStorage first and the cookie
 * fallback second. Never throws; unreadable storage reads as no record.
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
 * Persist an assignment. Writes localStorage when available and falls back
 * to a cookie otherwise. A successful localStorage write also drops any
 * fallback cookie a previous visit left, so a later read that has to fall
 * back to the cookie cannot restore an older arm. Never throws.
 */
export const writeStoredExperimentAssignment =
	function writeStoredExperimentAssignment(
		record: StoredExperimentAssignment,
		storageConfig?: StorageConfig
	): void {
		const serialized = JSON.stringify(record);
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
	/** The assignment this browser already stored, if any. */
	stored: StoredExperimentAssignment | null;
	/** The hydrated subject id, when the visitor already has one. */
	subjectId?: string | null;
	/**
	 * An arm already on the kernel for this experiment: a server prefetch
	 * that rendered it. Kept over the stored arm so the impression is
	 * attributed to what the visitor saw.
	 */
	seeded?: ExperimentAssignment | null;
	/** Random key factory; injectable for tests. */
	createKey?: () => string;
}

/**
 * Decide the arm for this browser without touching storage.
 *
 * - A host `variant` wins and replaces whatever was stored.
 * - A `seeded` arm the kernel already carries is kept when it still exists
 *   in `variants`: the server rendered it.
 * - A stored arm for the same experiment id is reused when it still exists
 *   in `variants`, so an arm is sticky across sessions.
 * - Otherwise the arm is hashed from the subject id, or from a fresh random
 *   key that the returned record carries for the next visit.
 *
 * @param input - The experiment, the stored record, the seeded arm and the
 * subject id.
 * @returns The assignment plus the record to store.
 * @throws {Error} When `experiment.variant` names an undeclared arm, or a
 * supplied `weights` map reaches no arm.
 */
export const resolveExperimentAssignment = function resolveExperimentAssignment(
	input: ResolveExperimentAssignmentInput
): { assignment: ExperimentAssignment; record: StoredExperimentAssignment } {
	const { experiment, stored, seeded } = input;
	const acknowledgedDiagnostics = experiment.acknowledgeDiagnostics === true;
	const storedKey = stored?.id === experiment.id ? stored.key : undefined;
	const withKey = function withKey(
		assignment: ExperimentAssignment,
		key: string | undefined
	): StoredExperimentAssignment {
		return key === undefined ? { ...assignment } : { ...assignment, key };
	};
	if (experiment.variant !== undefined) {
		const assignment = assignExperimentVariant(experiment, '');
		return { assignment, record: withKey(assignment, storedKey) };
	}
	if (
		seeded?.id === experiment.id &&
		Object.hasOwn(experiment.variants, seeded.variant)
	) {
		const assignment: ExperimentAssignment = { ...seeded };
		return { assignment, record: withKey(assignment, storedKey) };
	}
	if (
		stored?.id === experiment.id &&
		Object.hasOwn(experiment.variants, stored.variant)
	) {
		const assignment: ExperimentAssignment = {
			acknowledgedDiagnostics,
			assignedBy: stored.assignedBy,
			id: stored.id,
			variant: stored.variant,
		};
		return { assignment, record: withKey(assignment, storedKey) };
	}
	if (input.subjectId) {
		const assignment = assignExperimentVariant(experiment, input.subjectId);
		return { assignment, record: withKey(assignment, storedKey) };
	}
	const key = storedKey || (input.createKey ?? randomKey)();
	const assignment = assignExperimentVariant(experiment, key);
	return { assignment, record: { ...assignment, key } };
};

/** Options of {@link createExperimentController}. */
export interface ExperimentControllerOptions extends ValidateExperimentOptions {
	experiment: ConsentExperiment;
	kernel: ConsentKernel;
	storageConfig?: StorageConfig;
	/**
	 * Receives acknowledged diagnostics, once per policy, and an experiment
	 * rejected by a policy that arrived after construction. Defaults to
	 * `console.warn` / `console.error`.
	 */
	report?: {
		warn?: (message: string, diagnostics: ExperimentDiagnostics) => void;
		error?: (error: Error) => void;
	};
}

/** Owns one experiment's validation and assignment for one kernel. */
export interface ExperimentController {
	/**
	 * Assign the arm for this browser and record it on the kernel. Reads
	 * and writes storage, so call it from a mount hook. Idempotent.
	 */
	assign: () => ExperimentAssignment;
	/** Stop watching the policy. */
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
 * Validate an experiment and prepare its assignment.
 *
 * Construction validates every arm under the kernel's current policy rule
 * — the safe fallback while nothing is resolved — and throws for an
 * unacknowledged arm with diagnostics, so a misconfiguration fails at
 * provider construction. Every later policy is validated once, from the
 * kernel's snapshot subscription, which runs before the commit that
 * changed the policy emits `surface:shown`: an impression is never stamped
 * with an arm the policy rejects. A rejection is reported and the arm is
 * cleared so the base presentation renders; it is remembered per policy,
 * so a policy that accepted the arm restores it when it returns. A
 * host-resolved `variant` is recorded on the kernel at once; built-in
 * assignment waits for {@link ExperimentController.assign}.
 *
 * @param options - Experiment, kernel and reporting configuration.
 * @returns The controller.
 * @throws {Error} When `experiment.variant` names an undeclared arm, or an
 * unacknowledged arm trips diagnostics under the current policy.
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
	/** Whether each policy seen so far rejected the experiment. */
	const rejectedByPolicy = new Map<string, boolean>();
	let lastPolicy: ConsentSnapshot['policyRule'] | null = null;
	let rejected = false;
	/**
	 * An arm the kernel already carries for this experiment: a server
	 * prefetch that rendered it. The visitor saw that arm, so the browser
	 * keeps it rather than re-assigning.
	 */
	const seeded = kernel.getSnapshot().experiment;
	/** The arm this browser runs whenever the policy accepts it. */
	let current: ExperimentAssignment | null = null;
	if (experiment.variant !== undefined) {
		current = assignExperimentVariant(experiment, '');
	} else if (
		seeded?.id === experiment.id &&
		Object.hasOwn(experiment.variants, seeded.variant)
	) {
		current = { ...seeded };
	}

	const apply = function apply(): void {
		kernel.set.experiment(rejected ? null : current);
	};

	const validateOnce = function validateOnce(
		snapshot: ConsentSnapshot,
		throwing: boolean
	): boolean {
		const { policyRule } = snapshot;
		try {
			const diagnostics = validateExperiment(experiment, policyRule, options);
			if (Object.keys(diagnostics).length > 0) {
				warn(
					`c15t experiment "${experiment.id}": running with acknowledged presentation diagnostics under policy "${policyRule.id}".`,
					diagnostics
				);
			}
			return false;
		} catch (failure) {
			if (throwing) {
				throw failure;
			}
			error(failure instanceof Error ? failure : new Error(String(failure)));
			return true;
		}
	};

	const validate = function validate(
		snapshot: ConsentSnapshot,
		throwing: boolean
	): void {
		if (snapshot.policyRule === lastPolicy) {
			return;
		}
		lastPolicy = snapshot.policyRule;
		const key = policyKey(snapshot);
		let outcome = rejectedByPolicy.get(key);
		if (outcome === undefined) {
			outcome = validateOnce(snapshot, throwing);
			rejectedByPolicy.set(key, outcome);
		}
		rejected = outcome;
		apply();
	};

	validate(kernel.getSnapshot(), true);
	const unsubscribe = kernel.subscribe((snapshot) => {
		validate(snapshot, false);
	});
	let assigned: ExperimentAssignment | null = null;
	return {
		assign() {
			if (assigned) {
				return assigned;
			}
			const { assignment, record } = resolveExperimentAssignment({
				experiment,
				seeded,
				stored: readStoredExperimentAssignment(),
				subjectId: kernel.getSnapshot().subject?.subjectId ?? null,
			});
			writeStoredExperimentAssignment(record, options.storageConfig);
			assigned = assignment;
			current = assignment;
			apply();
			return assignment;
		},
		dispose() {
			unsubscribe();
		},
	};
};
