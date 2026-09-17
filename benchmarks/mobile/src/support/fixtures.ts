/**
 * The payloads every JavaScript-side measurement runs against.
 *
 * Sized like a real app rather than like a unit test: one policy resolution with
 * the three fingerprints a real `/init` carries, banner copy in two locales, and
 * five categories. A hydrate number measured against a three-field object would
 * be a number about nothing.
 */

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
	explicitChoice: {
		action: 'accept' | 'reject' | 'customize';
		actionAt: number;
		consents: Record<string, boolean>;
	} | null;
	iab: null;
	location: { country: string; language: string; region: string | null } | null;
	model: 'opt-in' | 'opt-out' | 'none';
	nextDeadline: number | null;
	optOutDirectives: never[];
	overrides: {
		country: string | null;
		language: string;
		region: string | null;
		test: string | null;
	};
	policyPending: boolean;
	policySnapshotToken: string | null;
	privacySignals: { gpc: boolean; msa: boolean };
	promptRequirement: { kind: 'choice' | 'notice'; reason: string };
	ready: boolean;
	resolution: {
		fingerprint: string | null;
		policyId: string | null;
		status: string;
	};
	restrictions: Record<string, string[]>;
	revision: number;
	subject: { subjectId: string } | null;
	translations: unknown;
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

/** Two locales of banner copy, the way a real `/init` ships them. */
const translations = {
	de: {
		banner: {
			actions: {
				accept: 'Alle akzeptieren',
				customize: 'Zwecke verwalten',
				reject: 'Alle ablehnen',
			},
			description:
				'Wir verwenden Cookies, um die Website bereitzustellen, Ihre Entscheidungen zu speichern, den Traffic zu messen und Anzeigen anzuzeigen. Sie können alle akzeptieren, alle ablehnen oder einzeln entscheiden.',
			title: 'Ihre Datenschutzentscheidungen',
		},
		purposes: {
			experience: { title: 'Erlebnis' },
			functionality: { title: 'Funktionalität' },
			marketing: { title: 'Werbung' },
			measurement: { title: 'Messung' },
			necessary: { title: 'Technisch notwendig' },
		},
	},
	en: {
		banner: {
			actions: {
				accept: 'Accept all',
				customize: 'Manage purposes',
				reject: 'Reject all',
			},
			description:
				'We use cookies to run the site, remember your choices, measure traffic, and show ads that are not made up. You can accept everything, reject everything, or decide per purpose.',
			title: 'Your privacy choices',
		},
		purposes: {
			experience: { title: 'Experience' },
			functionality: { title: 'Functionality' },
			marketing: { title: 'Marketing' },
			measurement: { title: 'Measurement' },
			necessary: { title: 'Strictly necessary' },
		},
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
		location: { country: 'DE', language: 'en', region: 'BE' },
		model: 'opt-in',
		nextDeadline: null,
		optOutDirectives: [],
		overrides: { country: 'DE', language: 'en', region: 'BE', test: null },
		policyPending: false,
		policySnapshotToken: 'pst_01J9ZQ8H7G6F5E4D3C2B1A098765',
		privacySignals: { gpc: false, msa: false },
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
		translations,
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
		records: {
			functionality: { granted: true, updatedAt: 1_769_000_000_000 },
			necessary: { granted: true, updatedAt: 1_769_000_000_000 },
		},
		snapshot: JSON.parse(REALISTIC_SNAPSHOT_JSON),
		subject: { id: 'sub-bench-1' },
		version: 1,
	});
};
