/**
 * Generates the screen-model fixtures in `native/ui/`.
 *
 * The React Native renderers, and the SwiftUI and Compose ones after them,
 * draw a screen from one portable description: which sections, rows, switches
 * and actions exist, and which way each switch points. That description comes
 * from the pure builders in `src/ui-model/`. These fixtures pin it, so three
 * implementations show the same toggles and the same legal parity without
 * reading each other's code. Run it with:
 *
 * ```bash
 * bun run --cwd packages/react-native generate:ui-fixtures
 * ```
 *
 * What lands in `native/ui/`:
 *
 * - `inputs/*.json` — the shared inputs: English copy for both flows and a
 *   small IAB disclosure with four partners, one stack, and one purpose no
 *   partner holds on consent.
 * - `fixtures/*.json` — one builder call each: `builder`, `input`, and the
 *   literal `expected` screen (or selection). An input value written
 *   `{ "$ref": "<name>" }` stands for `inputs/<name>.json`.
 * - `index.json` — every input and fixture with its byte count and SHA-256, so
 *   a runner enumerates files instead of hard-coding names and can prove it
 *   read the bytes this script wrote.
 *
 * Re-running the script must not change a byte.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
	mkdirSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
	ConsentIabDisplayModel,
	ConsentIabDisplayRow,
	ConsentIabProcessedPurpose,
	ConsentIabProcessedVendor,
} from '../src/components/iab-display-model';
import type { ConsentCategoryRow } from '../src/components/internal/categories';
import { resolveConsentCopy } from '../src/components/internal/copy';
import { resolveIabCopy } from '../src/components/internal/iab-copy';
import {
	applyIabToggle,
	buildFirstLayer,
	buildIabFirstLayer,
	buildIabPurposeDetail,
	buildIabPurposes,
	buildIabVendorDetail,
	buildIabVendors,
	buildPreferences,
	seedConsentIabSelection,
} from '../src/ui-model';

/** Bumped when a fixture's shape changes in a way a runner must notice. */
const UI_MODEL_VERSION = 1;

/** A shared input file, referenced from fixtures by name. */
interface SharedInput {
	readonly name: string;
	readonly value: unknown;
}

/** One builder call and what it returned. */
interface Fixture {
	readonly builder: string;
	readonly description: string;
	readonly expected: unknown;
	readonly id: string;
	readonly input: Record<string, unknown>;
}

const ref = (name: string) => ({ $ref: name });

// --- The sample disclosure -------------------------------------------------

const vendor = function vendor(
	fields: Partial<ConsentIabProcessedVendor> &
		Pick<ConsentIabProcessedVendor, 'id' | 'name'>
): ConsentIabProcessedVendor {
	return {
		cookieMaxAgeSeconds: null,
		deviceStorageDisclosureUrl: null,
		features: [],
		legIntPurposes: [],
		policyUrl: '',
		purposes: [],
		specialFeatures: [],
		specialPurposes: [],
		usesCookies: false,
		usesNonCookieAccess: false,
		...fields,
	};
};

const ACME = vendor({
	id: 'acme-analytics',
	isCustom: true,
	name: 'Acme Analytics',
	policyUrl: 'https://acme.example/privacy',
	purposes: [1, 8],
});

const ADNAMI = vendor({
	cookieMaxAgeSeconds: 7_776_000,
	dataRetention: { stdRetention: 365 },
	deviceStorageDisclosureUrl: 'https://adnami.example/device-storage.json',
	features: [1],
	id: 1,
	legIntPurposes: [7],
	name: 'Adnami Ltd',
	policyUrl: 'https://adnami.example/privacy',
	purposes: [1, 2, 3],
	specialFeatures: [1],
	specialPurposes: [1],
	usesCookies: true,
});

const GOOGLE = vendor({
	cookieMaxAgeSeconds: 34_190_000,
	features: [2],
	id: 755,
	legIntPurposes: [2, 7],
	name: 'Google Advertising Products',
	policyUrl: 'https://business.safety.google/privacy/',
	purposes: [1, 3, 4],
	specialPurposes: [1, 2],
	usesCookies: true,
	usesNonCookieAccess: true,
});

const MEASURE = vendor({
	cookieMaxAgeSeconds: 2_592_000,
	id: 42,
	legIntPurposes: [8],
	name: 'Measure Co',
	policyUrl: 'https://measure.example/privacy',
	usesCookies: true,
});

/** Every partner, sorted by name the way the web lists them. */
const VENDORS = [ACME, ADNAMI, GOOGLE, MEASURE];

const claiming = (
	ids: (vendor: ConsentIabProcessedVendor) => number[],
	id: number
) => VENDORS.filter((candidate) => ids(candidate).includes(id));

const purposeVendors = (id: number) =>
	VENDORS.filter(
		(candidate) =>
			candidate.purposes.includes(id) || candidate.legIntPurposes.includes(id)
	);

const PURPOSE_TEXT: Record<number, [string, string, string[]]> = {
	1: [
		'Store and/or access information on a device',
		'Cookies, device or similar online identifiers can be stored on or accessed from your device.',
		[
			'Most purposes explained in this notice rely on storing or accessing information from your device.',
		],
	],
	2: [
		'Use limited data to select advertising',
		'Advertising presented to you can be based on limited data, such as the app you are using.',
		[],
	],
	3: [
		'Create profiles for personalised advertising',
		'Information about your activity can be used to build a profile about you.',
		[],
	],
	4: [
		'Use profiles to select personalised advertising',
		'Advertising presented to you can be based on your advertising profile.',
		[],
	],
	7: [
		'Measure advertising performance',
		'Information about which advertising is presented to you and how you interact with it can be used to measure its performance.',
		[],
	],
	8: [
		'Measure content performance',
		'Information about which content is presented to you and how you interact with it can be used to measure its performance.',
		[],
	],
};

const processedPurpose = function processedPurpose(
	id: number
): ConsentIabProcessedPurpose {
	const [name, description, illustrations] = PURPOSE_TEXT[id] ?? ['', '', []];
	return { description, id, illustrations, name, vendors: purposeVendors(id) };
};

const purposeRow = function purposeRow(id: number): ConsentIabDisplayRow {
	const purpose = processedPurpose(id);
	return {
		description: purpose.description,
		hasConsentBasis: purpose.vendors.some((candidate) =>
			candidate.purposes.includes(id)
		),
		id,
		illustrations: purpose.illustrations,
		kind: 'purpose',
		locked: false,
		name: purpose.name,
		testId: `purpose-item-${String(id)}`,
		toggle: 'purpose',
		vendors: purpose.vendors,
	};
};

const SPECIAL_PURPOSE_TEXT: Record<number, [string, string]> = {
	1: [
		'Ensure security, prevent and detect fraud, and fix errors',
		'Your data can be used to monitor for and prevent unusual and possibly fraudulent activity.',
	],
	2: [
		'Deliver and present advertising and content',
		'Certain information is used to technically deliver advertising or content to your device.',
	],
};

const FEATURE_TEXT: Record<number, [string, string]> = {
	1: [
		'Match and combine data from other data sources',
		'Information about your activity in this service may be matched and combined with other information.',
	],
	2: [
		'Link different devices',
		'Different devices can be determined as belonging to you or your household.',
	],
};

const SPECIAL_FEATURE_TEXT: Record<number, [string, string]> = {
	1: [
		'Use precise geolocation data',
		'With your acceptance, your precise location can be used.',
	],
};

const textRow = function textRow(
	kind: 'feature' | 'special-feature' | 'special-purpose',
	id: number,
	[name, description]: [string, string],
	vendors: ConsentIabProcessedVendor[]
): ConsentIabDisplayRow {
	return {
		description,
		hasConsentBasis: true,
		id,
		illustrations: [],
		kind,
		locked: kind === 'special-purpose',
		name,
		testId: `${kind}-item-${String(id)}`,
		toggle: kind === 'special-feature' ? 'special-feature' : 'none',
		vendors,
	};
};

const at = <ValueType>(record: Record<number, ValueType>, id: number) => {
	const value = record[id];
	if (value === undefined) {
		throw new Error(`No sample text for id ${String(id)}`);
	}
	return value;
};

const specialPurposeRow = (id: number) =>
	textRow(
		'special-purpose',
		id,
		at(SPECIAL_PURPOSE_TEXT, id),
		claiming((candidate) => candidate.specialPurposes, id)
	);

const featureRow = (id: number) =>
	textRow(
		'feature',
		id,
		at(FEATURE_TEXT, id),
		claiming((candidate) => candidate.features, id)
	);

const specialFeatureRow = (id: number) =>
	textRow(
		'special-feature',
		id,
		at(SPECIAL_FEATURE_TEXT, id),
		claiming((candidate) => candidate.specialFeatures, id)
	);

const STACK_PURPOSES = [3, 4, 7];

const asProcessed = (row: ConsentIabDisplayRow) => ({
	description: row.description,
	id: row.id,
	illustrations: row.illustrations,
	name: row.name,
	vendors: row.vendors,
});

const IAB_MODEL: ConsentIabDisplayModel = {
	consentRows: [
		purposeRow(1),
		purposeRow(2),
		{
			description:
				'Advertising can be personalised based on a profile, and its performance measured.',
			id: 42,
			kind: 'stack',
			name: 'Personalised advertising and measurement',
			purposes: STACK_PURPOSES.map(purposeRow),
			testId: 'stack-item-42',
		},
		purposeRow(8),
		specialFeatureRow(1),
	],
	data: {
		features: [1, 2].map((id) => asProcessed(featureRow(id))),
		isLoading: false,
		isReady: true,
		purposes: [1, 2, 3, 4, 7, 8].map(processedPurpose),
		specialFeatures: [asProcessed(specialFeatureRow(1))],
		specialPurposes: [1, 2].map((id) => ({
			...asProcessed(specialPurposeRow(id)),
			isSpecialPurpose: true,
		})),
		stacks: [
			{
				description:
					'Advertising can be personalised based on a profile, and its performance measured.',
				id: 42,
				name: 'Personalised advertising and measurement',
				purposes: STACK_PURPOSES.map(processedPurpose),
			},
		],
		standalonePurposes: [1, 2, 8].map(processedPurpose),
		totalVendors: VENDORS.length,
	},
	essentialPartnerCount: 2,
	essentialRows: [specialPurposeRow(1), specialPurposeRow(2)],
	featureRows: [featureRow(1), featureRow(2)],
	featuresStandardText: null,
	isLoading: false,
	isReady: true,
	purposeTabCount: 7,
	vendorTabCount: VENDORS.length,
	vendors: VENDORS,
};

// --- Shared inputs ----------------------------------------------------------

const STANDARD_COPY = resolveConsentCopy(null);
const IAB_COPY = resolveIabCopy();

const INPUTS: SharedInput[] = [
	{ name: 'iab-copy', value: IAB_COPY },
	{ name: 'iab-model', value: IAB_MODEL },
	{ name: 'standard-copy', value: STANDARD_COPY },
];

const categoryRows = function categoryRows(
	overrides: Partial<
		Record<ConsentCategoryRow['key'], Partial<ConsentCategoryRow>>
	>
): ConsentCategoryRow[] {
	const base: ConsentCategoryRow[] = [
		{
			description: STANDARD_COPY.categories.necessary.description,
			disabled: true,
			key: 'necessary',
			label: STANDARD_COPY.categories.necessary.title,
			value: true,
		},
		{
			description: STANDARD_COPY.categories.measurement.description,
			disabled: false,
			key: 'measurement',
			label: STANDARD_COPY.categories.measurement.title,
			value: false,
		},
		{
			description: STANDARD_COPY.categories.marketing.description,
			disabled: false,
			key: 'marketing',
			label: STANDARD_COPY.categories.marketing.title,
			value: false,
		},
	];
	return base.map((row) => ({ ...row, ...overrides[row.key] }));
};

/** Most purposes on, the stack only partly on, one objection lodged. */
const PARTIAL_SELECTION = seedConsentIabSelection(IAB_MODEL, {
	purposeConsents: { 1: true, 3: true, 8: true },
	vendorConsents: { '1': true },
	vendorLegitimateInterests: { '755': false },
});

const DEFAULT_SELECTION = seedConsentIabSelection(IAB_MODEL);

// --- Fixtures ---------------------------------------------------------------

const iabInput = (extra: Record<string, unknown> = {}) => ({
	copy: ref('iab-copy'),
	model: ref('iab-model'),
	...extra,
});

const buildFixtures = function buildFixtures(): Fixture[] {
	const preferencesOptIn = categoryRows({});
	const preferencesRestricted = categoryRows({
		marketing: { disabled: true, value: false },
		measurement: { value: true },
	});

	return [
		{
			builder: 'buildFirstLayer',
			description:
				'Opt-in first layer. Accept all and Reject all share parity, so neither can be drawn weaker than the other.',
			expected: buildFirstLayer({ copy: STANDARD_COPY, notice: false }),
			id: 'standard-first-layer-choice',
			input: { copy: ref('standard-copy'), notice: false },
		},
		{
			builder: 'buildFirstLayer',
			description:
				'Notice first layer. There is nothing to decide, so it offers one acknowledgement and the way into preferences.',
			expected: buildFirstLayer({ copy: STANDARD_COPY, notice: true }),
			id: 'standard-first-layer-notice',
			input: { copy: ref('standard-copy'), notice: true },
		},
		{
			builder: 'buildPreferences',
			description:
				'Preferences before any choice: necessary is locked on, everything else is off.',
			expected: buildPreferences({
				copy: STANDARD_COPY,
				rows: preferencesOptIn,
			}),
			id: 'standard-preferences-opt-in',
			input: { copy: ref('standard-copy'), rows: preferencesOptIn },
		},
		{
			builder: 'buildPreferences',
			description:
				'A restricted category is locked off, a pending switch shows its draft value, and the branding footnote is hidden.',
			expected: buildPreferences({
				copy: STANDARD_COPY,
				hideBranding: true,
				rows: preferencesRestricted,
			}),
			id: 'standard-preferences-restricted',
			input: {
				copy: ref('standard-copy'),
				hideBranding: true,
				rows: preferencesRestricted,
			},
		},
		{
			builder: 'buildIabFirstLayer',
			description:
				'IAB first layer: the partner count, every purpose and stack by name, and Accept all and Reject all at parity.',
			expected: buildIabFirstLayer({ copy: IAB_COPY, model: IAB_MODEL }),
			id: 'iab-first-layer',
			input: iabInput(),
		},
		{
			builder: 'buildIabPurposes',
			description:
				'Purposes with a stack that is only partly on. Purpose 7 has no consent basis, so its switch is locked off. Special purposes get no switch.',
			expected: buildIabPurposes({
				copy: IAB_COPY,
				model: IAB_MODEL,
				selection: PARTIAL_SELECTION,
			}),
			id: 'iab-purposes-partial-stack',
			input: iabInput({ selection: PARTIAL_SELECTION }),
		},
		{
			builder: 'buildIabVendors',
			description:
				'A partner search that matches two names, case-insensitively, with surrounding spaces trimmed.',
			expected: buildIabVendors({
				copy: IAB_COPY,
				model: IAB_MODEL,
				query: '  AD ',
				selection: PARTIAL_SELECTION,
			}),
			id: 'iab-vendors-search-hit',
			input: iabInput({ query: '  AD ', selection: PARTIAL_SELECTION }),
		},
		{
			builder: 'buildIabVendors',
			description:
				'A partner search with no hits: no sections, and the empty-state text naming the search.',
			expected: buildIabVendors({
				copy: IAB_COPY,
				model: IAB_MODEL,
				query: 'zzz',
				selection: DEFAULT_SELECTION,
			}),
			id: 'iab-vendors-search-miss',
			input: iabInput({ query: 'zzz', selection: DEFAULT_SELECTION }),
		},
		{
			builder: 'buildIabVendorDetail',
			description:
				'A partner with an objection lodged against its legitimate interest, cookie storage, and non-cookie access.',
			expected: buildIabVendorDetail({
				copy: IAB_COPY,
				model: IAB_MODEL,
				selection: PARTIAL_SELECTION,
				vendorId: 755,
			}),
			id: 'iab-vendor-detail-legitimate-interest',
			input: iabInput({ selection: PARTIAL_SELECTION, vendorId: 755 }),
		},
		{
			builder: 'buildIabVendorDetail',
			description:
				'A partner with a retention period, a storage disclosure, a special feature, and a feature.',
			expected: buildIabVendorDetail({
				copy: IAB_COPY,
				model: IAB_MODEL,
				selection: PARTIAL_SELECTION,
				vendorId: 1,
			}),
			id: 'iab-vendor-detail-storage',
			input: iabInput({ selection: PARTIAL_SELECTION, vendorId: 1 }),
		},
		{
			builder: 'buildIabPurposeDetail',
			description:
				'A stack opened: its own switch, then one switch per purpose it covers, then the partners that use it.',
			expected: buildIabPurposeDetail({
				copy: IAB_COPY,
				model: IAB_MODEL,
				routeId: 'stack.42',
				selection: PARTIAL_SELECTION,
			}),
			id: 'iab-purpose-detail-stack',
			input: iabInput({ routeId: 'stack.42', selection: PARTIAL_SELECTION }),
		},
		{
			builder: 'buildIabPurposeDetail',
			description:
				'A special purpose opened: what it covers and who uses it, with no switch.',
			expected: buildIabPurposeDetail({
				copy: IAB_COPY,
				model: IAB_MODEL,
				routeId: 'specialPurpose.1',
				selection: PARTIAL_SELECTION,
			}),
			id: 'iab-purpose-detail-special-purpose',
			input: iabInput({
				routeId: 'specialPurpose.1',
				selection: PARTIAL_SELECTION,
			}),
		},
		{
			builder: 'applyIabToggle',
			description:
				'Turning a stack on turns every purpose it covers on, and nothing else.',
			expected: applyIabToggle(IAB_MODEL, PARTIAL_SELECTION, 'stack.42', true),
			id: 'iab-toggle-stack',
			input: {
				model: ref('iab-model'),
				rowId: 'stack.42',
				selection: PARTIAL_SELECTION,
				value: true,
			},
		},
		{
			builder: 'seedConsentIabSelection',
			description:
				'The draft before any choice: every consent off, every legitimate interest standing.',
			expected: DEFAULT_SELECTION,
			id: 'iab-seed-default',
			input: { model: ref('iab-model') },
		},
	];
};

// --- Writing ----------------------------------------------------------------

const sha256Of = (bytes: Uint8Array) =>
	createHash('sha256').update(bytes).digest('hex');

const formatWith = function formatWith(paths: string[], cwd: string): void {
	const format = spawnSync('bunx', ['oxfmt', ...paths], {
		cwd,
		stdio: 'ignore',
	});
	if (format.status !== 0) {
		throw new Error(`Oxfmt failed on: ${paths.join(', ')}`);
	}
};

const writeJson = (path: string, value: unknown) =>
	writeFileSync(path, `${JSON.stringify(value, null, '\t')}\n`, 'utf8');

const entryFor = (dir: string, folder: string, name: string) => {
	const file = `${folder}/${name}.json`;
	const bytes = readFileSync(resolve(dir, file));
	return { bytes: bytes.byteLength, file, sha256: sha256Of(bytes) };
};

export const writeUiFixtures = function writeUiFixtures(outDir?: string): void {
	const here = dirname(fileURLToPath(import.meta.url));
	const repoRoot = resolve(here, '..', '..', '..');
	const target = outDir ?? resolve(repoRoot, 'native', 'ui');
	const inputsDir = resolve(target, 'inputs');
	const fixturesDir = resolve(target, 'fixtures');

	// Start clean so a fixture this script stopped writing can't linger.
	rmSync(inputsDir, { force: true, recursive: true });
	rmSync(fixturesDir, { force: true, recursive: true });
	mkdirSync(inputsDir, { recursive: true });
	mkdirSync(fixturesDir, { recursive: true });

	const fixtures = buildFixtures();
	const ids = new Set<string>();
	for (const fixture of fixtures) {
		if (ids.has(fixture.id)) {
			throw new Error(`Duplicate fixture id: ${fixture.id}`);
		}
		ids.add(fixture.id);
	}

	for (const input of INPUTS) {
		writeJson(resolve(inputsDir, `${input.name}.json`), input.value);
	}
	for (const fixture of fixtures) {
		writeJson(resolve(fixturesDir, `${fixture.id}.json`), {
			builder: fixture.builder,
			description: fixture.description,
			expected: fixture.expected,
			id: fixture.id,
			input: fixture.input,
			version: UI_MODEL_VERSION,
		});
	}

	// Format before hashing, so the index describes the bytes a runner opens.
	formatWith([inputsDir, fixturesDir], repoRoot);

	const index = {
		count: fixtures.length,
		fixtures: fixtures.map((fixture) => ({
			builder: fixture.builder,
			id: fixture.id,
			...entryFor(target, 'fixtures', fixture.id),
		})),
		generatedBy: 'packages/react-native/scripts/generate-ui-fixtures.ts',
		inputs: INPUTS.map((input) => ({
			name: input.name,
			...entryFor(target, 'inputs', input.name),
		})),
		version: UI_MODEL_VERSION,
	};
	const indexPath = resolve(target, 'index.json');
	writeJson(indexPath, index);
	formatWith([indexPath], repoRoot);

	const written = readdirSync(fixturesDir).length;
	if (written !== fixtures.length) {
		throw new Error(
			`Wrote ${String(written)} fixture files for ${String(fixtures.length)} fixtures.`
		);
	}
};

const invokedAsProgram = function invokedAsProgram(): boolean {
	const [, entry] = process.argv;
	if (entry === undefined) {
		return false;
	}
	try {
		return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
	} catch {
		return false;
	}
};

if (invokedAsProgram()) {
	writeUiFixtures();
}
