/**
 * The snapshot's wire shape, checked by key name rather than by cast.
 *
 * `ConsentSnapshot` is the shape on the wire, but the bridge hands JavaScript a
 * JSON string, so TypeScript cannot see a renamed key: the declared type says
 * `subject.subjectId`, a core sends `subject.id`, and every app on that platform
 * reads `undefined` with nothing failing anywhere. Four keys drifted that way once,
 * behind a fixture runner that tolerated them, and the only visible symptom was a
 * consent screen printing an empty subject.
 *
 * The kernel owns the spelling of four objects on the snapshot. Here that spelling
 * is written down once so the protocol fixtures generated from the TypeScript kernel
 * can be checked against it, and so a native core that renames a key is a failing
 * assertion rather than an undefined read in someone's app.
 *
 * @packageDocumentation
 */

/** Keys the kernel uses inside an object it owns, with which of them must appear. */
interface KernelOwnedKeys {
	/** The snapshot field holding the object. */
	readonly path: string;
	/** Keys that must be present whenever the object is. */
	readonly required: readonly string[];
	/** Keys allowed but not required. Anything else is drift. */
	readonly optional: readonly string[];
}

/**
 * Every key `ConsentSnapshot` declares.
 *
 * `iab` is reserved and serialized as `null`, so it belongs on the list even while
 * TCF stays out of scope: dropping the key is itself a wire change.
 */
export const SNAPSHOT_KEYS = [
	'revision',
	'policyPending',
	'ready',
	'model',
	'activeUI',
	'promptRequirement',
	'effectivePermissions',
	'explicitChoice',
	'consentCategories',
	'restrictions',
	'resolution',
	'policySnapshotToken',
	'subject',
	'location',
	'overrides',
	'privacySignals',
	'optOutDirectives',
	'translations',
	'nextDeadline',
	'evaluatedAt',
	'error',
	'iab',
] as const;

/**
 * The four objects whose key names come from `@c15t/core` and are not a native
 * implementation detail. Names inside a core, and names inside a stored envelope,
 * stay the core's own business.
 */
export const KERNEL_OWNED_KEYS = [
	{
		optional: ['externalId', 'identityProvider'],
		path: 'subject',
		required: ['subjectId'],
	},
	{
		optional: [],
		path: 'location',
		required: ['countryCode', 'regionCode'],
	},
	{
		optional: ['reason'],
		path: 'promptRequirement',
		required: ['kind'],
	},
	{
		optional: [],
		path: 'explicitChoice',
		required: ['version', 'categories'],
	},
] as const satisfies readonly KernelOwnedKeys[];

/**
 * How strictly to read a payload against the declared shape.
 */
export interface WireDriftOptions {
	/**
	 * Accept keys the declared types do not name.
	 *
	 * `native/CONTRACT.md` lets a native build send a field the JavaScript side has
	 * not caught up with, so a payload from a newer core is not drift, and a warning
	 * about it would be a false alarm on every app that upgraded its native half. The
	 * keys a kernel owns are still checked for the ones that must be there, and when
	 * one of those is missing the keys that turned up instead get named. That is what
	 * makes a rename visible: it is invisible in every other way, and it costs a
	 * user's consent state.
	 *
	 * @defaultValue `false`
	 */
	readonly allowUnknownKeys?: boolean;
}

const isRecord = function isRecord(
	value: unknown
): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Name every way a parsed bridge payload departs from the declared snapshot shape.
 *
 * Deliberately structural and deliberately non-throwing. A value that fails here is
 * not unusable in every respect, and the caller already has a fail-closed path for
 * payloads it cannot read at all; this exists to say specifically which keys are
 * wrong, because "not a readable snapshot" is not something a core author can act on.
 *
 * @param candidate - The parsed value from `getSnapshot()`, or a fixture's expected snapshot.
 * @param options - Looseness for a payload from a newer native build than this package.
 * @returns One line per problem, in the order the shape was walked, empty when it matches.
 *
 * @example
 * ```ts
 * const problems = describeSnapshotWireDrift(JSON.parse(nativeModule.getSnapshot()));
 *
 * if (problems.length > 0) {
 * 	// Each line names a key, so a core author fixes the bridge rather than the app
 * 	// that read `undefined` from it.
 * 	report(problems);
 * }
 * ```
 */
export const describeSnapshotWireDrift = function describeSnapshotWireDrift(
	candidate: unknown,
	options: WireDriftOptions = {}
): string[] {
	const { allowUnknownKeys = false } = options;
	if (!isRecord(candidate)) {
		return ['the snapshot payload is not a JSON object'];
	}

	const problems: string[] = [];

	for (const key of SNAPSHOT_KEYS) {
		if (!Object.hasOwn(candidate, key)) {
			problems.push(
				`${key}: required by the snapshot type, absent from the payload`
			);
		}
	}

	if (!allowUnknownKeys) {
		for (const key of Object.keys(candidate)) {
			if (!SNAPSHOT_KEYS.includes(key as (typeof SNAPSHOT_KEYS)[number])) {
				problems.push(`${key}: not a key the snapshot type declares`);
			}
		}
	}

	for (const owned of KERNEL_OWNED_KEYS) {
		const value = candidate[owned.path];

		if (value === null || value === undefined) {
			continue;
		}

		if (!isRecord(value)) {
			problems.push(
				`${owned.path}: expected an object the kernel owns, found ${typeof value}`
			);
			continue;
		}

		const allowed = new Set<string>([...owned.required, ...owned.optional]);

		let missing = 0;

		for (const key of owned.required) {
			if (!Object.hasOwn(value, key)) {
				missing += 1;
				problems.push(
					`${owned.path}.${key}: required here, absent from the payload`
				);
			}
		}

		// Naming a key the kernel does not use is only useful once something required
		// is gone, because that is what a rename looks like from here. An object that is
		// complete apart from a field added by a newer core stays quiet.
		if (!allowUnknownKeys || missing > 0) {
			for (const key of Object.keys(value)) {
				if (!allowed.has(key)) {
					problems.push(
						`${owned.path}.${key}: the kernel owns these key names and does not use "${key}" here`
					);
				}
			}
		}
	}

	return problems;
};
