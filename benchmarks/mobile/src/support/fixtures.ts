/**
 * The payloads every JavaScript-side measurement runs against.
 *
 * Sized like a real app rather than like a unit test: one policy resolution with
 * the three fingerprints a real `/init` carries, banner copy in two locales, and
 * five categories. A hydrate number measured against a three-field object would
 * be a number about nothing.
 */

/** Categories a subject can be asked about, which excludes the necessary one. */
export type BenchOptionalCategory =
	| 'experience'
	| 'functionality'
	| 'marketing'
	| 'measurement';

/**
 * One per-category receipt.
 *
 * Spelled as `CategoryDecision` in `@c15t/core`: the value, when it was confirmed,
 * and the policy contract it was confirmed under. A receipt without its basis is
 * a boolean, and the kernel refuses to trust one.
 */
interface BenchCategoryDecision {
	basis: { fingerprint: string; kind: 'choice-v1' };
	confirmedAt: number;
	value: boolean;
}

/** The explicit-choice record as it crosses the bridge: `version` 3 and receipts. */
export interface BenchExplicitChoice {
	categories: Partial<Record<BenchOptionalCategory, BenchCategoryDecision>>;
	version: 3;
}

/** Geographic context. The kernel owns these names: `countryCode`, `regionCode`. */
interface BenchLocation {
	countryCode: string;
	regionCode: string | null;
}

/** Overrides in effect. There is no test override, and `gpc` is an override here. */
interface BenchOverrides {
	country: string | null;
	gpc: boolean | null;
	language: string;
	region: string | null;
}

/** Detected signal, app override, and the value the evaluator honors. */
interface BenchGpcSignal {
	active: boolean;
	detected: boolean;
	override: boolean | null;
}

/** Privacy signals, as the kernel projects them. */
interface BenchPrivacySignals {
	gpc: BenchGpcSignal;
}

/** Resolved copy bundle: the language plus the namespaces the surfaces read. */
interface BenchTranslations {
	language: string;
	translations: {
		common: Record<string, string>;
		consentManagerDialog: Record<string, string>;
		consentTypes: Record<string, { description: string; title: string }>;
		cookieBanner: Record<string, string>;
		rights: Record<string, string>;
	};
}

/** Snapshot shape, kept structurally identical to the protocol type. */
export interface BenchSnapshot {
	activeUI: 'banner' | 'dialog' | 'none' | null;
	consentCategories: string[] | null;
	effectivePermissions: {
		experience: boolean;
		functionality: boolean;
		marketing: boolean;
		measurement: boolean;
		necessary: boolean;
	};
	error: { code: string; message: string } | null;
	evaluatedAt: number;
	explicitChoice: BenchExplicitChoice | null;
	iab: null;
	location: BenchLocation | null;
	model: 'opt-in' | 'opt-out' | 'none';
	nextDeadline: number | null;
	optOutDirectives: never[];
	overrides: BenchOverrides;
	policyPending: boolean;
	policySnapshotToken: string | null;
	privacySignals: BenchPrivacySignals;
	/** `none` is what a snapshot that owes nothing carries, per the deny-all shape. */
	promptRequirement: { kind: 'choice' | 'none' | 'notice'; reason: string };
	ready: boolean;
	resolution: {
		fingerprint: string | null;
		policyId: string | null;
		status: string;
	};
	restrictions: Record<string, string[]>;
	revision: number;
	subject: { subjectId: string } | null;
	translations: BenchTranslations | null;
}

/** Handshake payload the fake module serves. */
export const BENCH_BOOTSTRAP = {
	hasStoredSnapshot: true,
	maxSupportedProtocolVersion: 1,
	minSupportedProtocolVersion: 1,
	nativeSdkVersion: 'rn->9.9.9',
	protocolVersion: 1,
	subjectId: 'sub-bench-1',
};

/**
 * The choice-v1 fingerprint the receipts below were confirmed under.
 *
 * A real one is the hash of the policy contract, so it is opaque here too. It is
 * shared by every receipt in a fixture because they were all written by one action.
 */
export const BENCH_CHOICE_FINGERPRINT =
	'a35ac43b3d435b98441c5c39ccb3879d59d813fd9185d5fa9e3cfc08385412a9';

/**
 * Build receipts the way the kernel writes them.
 *
 * @param confirmedAt - Epoch milliseconds of the action that produced them.
 * @param values - Per-category value; an omitted category stays undecided.
 * @returns An explicit-choice record for the snapshot.
 */
export const buildExplicitChoice = function buildExplicitChoice(
	confirmedAt: number,
	values: Partial<Record<BenchOptionalCategory, boolean>> = {
		experience: true,
		functionality: true,
		marketing: true,
		measurement: true,
	}
): BenchExplicitChoice {
	const categories: Partial<
		Record<BenchOptionalCategory, BenchCategoryDecision>
	> = {};

	for (const [category, value] of Object.entries(values)) {
		if (typeof value === 'boolean') {
			categories[category as BenchOptionalCategory] = {
				basis: {
					fingerprint: BENCH_CHOICE_FINGERPRINT,
					kind: 'choice-v1',
				},
				confirmedAt,
				value,
			};
		}
	}

	return { categories, version: 3 };
};

/**
 * The copy bundle a device carries after `/init`, in English.
 *
 * One resolved bundle rather than a locale dictionary: the snapshot holds what the
 * backend served for one language, and the surfaces render it verbatim, so this is
 * the text that costs layout time.
 */
export const BENCH_TRANSLATIONS: BenchTranslations = {
	language: 'en',
	translations: {
		common: {
			acceptAll: 'Accept all',
			acknowledge: 'Got it',
			customize: 'Manage purposes',
			dismiss: 'Close',
			rejectAll: 'Reject all',
			save: 'Save',
		},
		consentManagerDialog: {
			description: 'Choose the categories this app may run.',
			title: 'Manage your privacy choices',
		},
		consentTypes: {
			experience: {
				description: 'Improves how the app answers.',
				title: 'Experience',
			},
			functionality: {
				description: 'Enables the features you asked for.',
				title: 'Functionality',
			},
			marketing: {
				description: 'Shows advertising that is not made up.',
				title: 'Marketing',
			},
			measurement: {
				description: 'Measures how the app is used.',
				title: 'Measurement',
			},
			necessary: {
				description: 'Required to run the app.',
				title: 'Strictly necessary',
			},
		},
		cookieBanner: {
			description:
				'We use cookies to run the site, remember your choices, measure traffic, and show advertising. You can accept everything, reject everything, or decide per purpose.',
			noticeDescription: 'How we use your data, in short.',
			noticeTitle: 'How we use your data',
			title: 'Your privacy choices',
		},
		rights: { preferences: 'Preferences' },
	},
};

/** The same bundle in German, for a host that pins a language. */
export const BENCH_TRANSLATIONS_DE: BenchTranslations = {
	language: 'de',
	translations: {
		common: {
			acceptAll: 'Alle akzeptieren',
			acknowledge: 'Verstanden',
			customize: 'Zwecke verwalten',
			dismiss: 'Schliessen',
			rejectAll: 'Alle ablehnen',
			save: 'Speichern',
		},
		consentManagerDialog: {
			description: 'Waehle die Kategorien, die diese App ausfuehren darf.',
			title: 'Zustimmung verwalten',
		},
		consentTypes: {
			experience: {
				description: 'Verbessert die Antworten der App.',
				title: 'Erlebnis',
			},
			functionality: {
				description: 'Eroegnet Funktionen, die du anforderst.',
				title: 'Funktionalitaet',
			},
			marketing: {
				description: 'Zeigt Werbung an.',
				title: 'Werbung',
			},
			measurement: {
				description: 'Misst die Nutzung der App.',
				title: 'Messung',
			},
			necessary: {
				description: 'Noetig fuer die App.',
				title: 'Notwendig',
			},
		},
		cookieBanner: {
			description:
				'Wir verwenden Cookies, um die App bereitzustellen, deine Entscheidungen zu speichern, den Traffic zu messen und Werbung anzuzeigen. Du kannst alles akzeptieren, alles ablehnen oder einzeln entscheiden.',
			noticeDescription: 'Wie wir deine Daten nutzen, kurz erklart.',
			noticeTitle: 'Wie wir deine Daten nutzen',
			title: 'Deine Datenschutzentscheidungen',
		},
		rights: { preferences: 'Einstellungen' },
	},
};

/**
 * Build a snapshot with realistic defaults.
 *
 * @param overrides - Fields to replace over the defaults.
 * @returns A snapshot the bridge accepts.
 */
export const buildSnapshot = function buildSnapshot(
	overrides: Partial<BenchSnapshot> = {}
): BenchSnapshot {
	return {
		activeUI: 'banner',
		consentCategories: null,
		effectivePermissions: {
			experience: false,
			functionality: true,
			marketing: false,
			measurement: false,
			necessary: true,
		},
		error: null,
		evaluatedAt: 1_770_000_000_000,
		explicitChoice: null,
		iab: null,
		location: { countryCode: 'DE', regionCode: 'BE' },
		model: 'opt-in',
		nextDeadline: null,
		optOutDirectives: [],
		overrides: { country: 'DE', gpc: null, language: 'en', region: 'BE' },
		policyPending: false,
		policySnapshotToken: 'pst_01J9ZQ8H7G6F5E4D3C2B1A098765',
		privacySignals: {
			gpc: { active: false, detected: false, override: null },
		},
		promptRequirement: { kind: 'choice', reason: 'missing' },
		ready: true,
		resolution: {
			fingerprint:
				'8aca68633714c54fb0a96eaee313aa415ae0a3137e56764cf629a20793b2f969',
			policyId: 'europe_opt_in',
			status: 'matched',
		},
		restrictions: {},
		revision: 0,
		subject: { subjectId: 'sub-bench-1' },
		translations: BENCH_TRANSLATIONS,
		...overrides,
	};
};

/** Serialized realistic snapshot, the bytes a stored envelope carries. */
export const REALISTIC_SNAPSHOT_JSON = JSON.stringify(buildSnapshot());

/** Bytes of the realistic payload, printed alongside the hydrate row. */
export const REALISTIC_SNAPSHOT_BYTES = Buffer.byteLength(
	REALISTIC_SNAPSHOT_JSON,
	'utf8'
);

/**
 * A stored envelope: the serialized snapshot plus the records that produced it.
 *
 * @returns The envelope text, sized like a device would hold it.
 */
export const buildStoredEnvelope = function buildStoredEnvelope(): string {
	return JSON.stringify({
		noticeDismissal: null,
		policyResolution: {
			fingerprints: {
				choice: BENCH_CHOICE_FINGERPRINT,
				notice:
					'7f05073243a60d3d057f8945113f5282024b4f5bcd13933e35952534ad1cf423',
				policy:
					'8aca68633714c54fb0a96eaee313aa415ae0a3137e56764cf629a20793b2f969',
			},
			matchedBy: 'country',
			policyId: 'europe_opt_in',
			status: 'matched',
			version: 1,
		},
		snapshot: JSON.parse(REALISTIC_SNAPSHOT_JSON),
		storedAt: 1_769_000_000_000,
		subject: { subjectId: 'sub-bench-1' },
		version: 1,
	});
};
