/** Raw fixtures deliberately avoid importing private core codecs or evaluators. */
import type {
	PolicyCategory,
	PolicyChoiceFixture,
	PolicyRecordFixture,
	PolicySubjectFixture,
} from '../contract/policy-scenarios';

type ValidPolicyRecordFixture = PolicyRecordFixture & {
	expected: Extract<PolicyRecordFixture['expected'], { valid: true }>;
};

/** Frozen clock keeps semantic expiry independent of machine time and cookie TTL. */
export const POLICY_NOW = 1_800_000_000_000;
export const POLICY_MAX_AGE = 86_400_000;
export const POLICY_RECENT = POLICY_NOW - 1_000;
export const POLICY_EXPIRED = POLICY_NOW - POLICY_MAX_AGE;
export const CHOICE_FINGERPRINT = 'choice-v1:current';
export const NOTICE_FINGERPRINT = 'notice-v1:current';
export const LEGACY_FINGERPRINT = 'legacy-material:current';
export const POLICY_SCOPE: readonly PolicyCategory[] = [
	'marketing',
	'measurement',
];

/** Build expected receipts without deriving any permission or prompt result. */
export const policyChoice = function policyChoice(
	values: Partial<Record<PolicyCategory, boolean>>,
	confirmedAt = POLICY_RECENT,
	basis: 'current' | 'legacy' | 'legacy-no-hash' | 'legacy-mismatch' = 'current'
): PolicyChoiceFixture {
	const receiptBasis: NonNullable<
		PolicyChoiceFixture['categories']['marketing']
	>['basis'] =
		basis === 'current'
			? { fingerprint: CHOICE_FINGERPRINT, kind: 'choice-v1' }
			: { kind: 'legacy-v2' };
	if (receiptBasis.kind === 'legacy-v2' && basis !== 'legacy-no-hash') {
		receiptBasis.materialFingerprint =
			basis === 'legacy-mismatch'
				? 'legacy-material:previous'
				: LEGACY_FINGERPRINT;
	}
	const categories: PolicyChoiceFixture['categories'] = {};
	for (const category of [
		'functionality',
		'experience',
		'measurement',
		'marketing',
	] as const) {
		const value = values[category];
		if (value !== undefined) {
			categories[category] = {
				basis: { ...receiptBasis },
				confirmedAt,
				value,
			};
		}
	}
	return { categories, version: 3 };
};

const identified: PolicySubjectFixture = {
	externalId: 'customer-1025',
	identityProvider: 'fixture-idp',
	subjectId: 'subject-1025',
};

const granted = { marketing: true, measurement: true };
const denied = { marketing: false, measurement: false };

const legacyJson = function legacyJson(
	values: Partial<Record<PolicyCategory, boolean>>,
	options: {
		time?: number;
		subject?: PolicySubjectFixture;
		basis?: 'legacy' | 'legacy-no-hash' | 'legacy-mismatch';
	} = {}
): ValidPolicyRecordFixture {
	const time = options.time ?? POLICY_RECENT;
	const basis = options.basis ?? 'legacy';
	const consentInfo: PolicySubjectFixture & {
		time: number;
		materialPolicyFingerprint?: string;
	} = { ...options.subject, time };
	if (basis !== 'legacy-no-hash') {
		consentInfo.materialPolicyFingerprint =
			basis === 'legacy-mismatch'
				? 'legacy-material:previous'
				: LEGACY_FINGERPRINT;
	}
	return {
		encoding: 'legacy-json',
		expected: {
			choice: policyChoice(values, time, basis),
			subject: options.subject ?? null,
			valid: true,
		},
		raw: JSON.stringify({
			consentInfo,
			consents: { necessary: true, ...values },
		}),
	};
};

const v3Choice = function v3Choice(
	choice: PolicyChoiceFixture
): ValidPolicyRecordFixture {
	return {
		encoding: 'v3-choice-json',
		expected: { choice, subject: null, valid: true },
		raw: JSON.stringify(choice),
	};
};

/**
 * v3 entries contain raw choice JSON, not a guessed persistence envelope.
 * Storage drivers wrap these using the versioned codec once it lands.
 */
export const POLICY_RECORDS = {
	'future-time': {
		encoding: 'legacy-json',
		expected: { valid: false },
		raw: `{"consents":{"marketing":true},"consentInfo":{"time":${POLICY_NOW + 1}}}`,
	},
	'invalid-json': {
		encoding: 'legacy-json',
		expected: { valid: false },
		raw: '{',
	},
	'legacy-anonymous-grant': legacyJson(granted),
	'legacy-compact-omitted-false': {
		encoding: 'legacy-compact',
		expected: {
			choice: policyChoice(
				{
					experience: false,
					functionality: false,
					marketing: true,
					measurement: false,
				},
				POLICY_RECENT,
				'legacy-no-hash'
			),
			subject: null,
			valid: true,
		},
		raw: `c.necessary:1,c.marketing:1,i.t:${POLICY_RECENT}`,
	},
	'legacy-custom-key-ignored': {
		encoding: 'legacy-json',
		expected: {
			choice: policyChoice({}, POLICY_RECENT, 'legacy-no-hash'),
			subject: null,
			valid: true,
		},
		raw: `{"consents":{"unknown":true},"consentInfo":{"time":${POLICY_RECENT}}}`,
	},
	'legacy-expired-denial': legacyJson(denied, { time: POLICY_EXPIRED }),
	'legacy-expired-grant': legacyJson(granted, { time: POLICY_EXPIRED }),
	'legacy-expired-mixed': legacyJson(
		{ marketing: true, measurement: false },
		{ time: POLICY_EXPIRED }
	),
	'legacy-identified-grant': legacyJson(granted, { subject: identified }),
	'legacy-json-denial': legacyJson({ marketing: false }),
	'legacy-material-mismatch': legacyJson(granted, { basis: 'legacy-mismatch' }),
	'legacy-no-hash': legacyJson(granted, { basis: 'legacy-no-hash' }),
	'legacy-numeric-string-identity': legacyJson(granted, {
		subject: { externalId: '1', identityProvider: '0', subjectId: '0' },
	}),
	'legacy-partial-json': legacyJson({ marketing: true }),
	'string-time': {
		encoding: 'legacy-json',
		expected: { valid: false },
		raw: `{"consents":{"marketing":true},"consentInfo":{"time":"${POLICY_RECENT}"}}`,
	},
	'unknown-v3-category': {
		encoding: 'v3-choice-json',
		expected: { valid: false },
		raw: `{"version":3,"categories":{"unknown":{"value":true,"confirmedAt":${POLICY_RECENT},"basis":{"kind":"choice-v1","fingerprint":"${CHOICE_FINGERPRINT}"}}}}`,
	},
	'unsupported-v1-identity': {
		encoding: 'legacy-json',
		expected: { valid: false },
		raw: `{"consents":{"marketing":true},"consentInfo":{"id":"v1-id","time":${POLICY_RECENT}}}`,
	},
	'unsupported-version': {
		encoding: 'v3-choice-json',
		expected: { valid: false },
		raw: '{"version":99,"categories":{},"consents":{"marketing":true},"consentInfo":{"time":1800000000000}}',
	},
	'v3-denial': v3Choice(policyChoice(denied)),
	'v3-grant': v3Choice(policyChoice(granted)),
	'v3-independent-times': v3Choice({
		categories: {
			...policyChoice({ marketing: true }, POLICY_EXPIRED).categories,
			...policyChoice({ measurement: true }).categories,
		},
		version: 3,
	}),
	'v3-mixed-bases': v3Choice({
		categories: {
			...policyChoice({ marketing: true }).categories,
			...policyChoice({ measurement: false }, POLICY_EXPIRED, 'legacy-no-hash')
				.categories,
		},
		version: 3,
	}),
	'v3-partial': v3Choice(policyChoice({ marketing: false })),
} satisfies Record<string, PolicyRecordFixture>;

/** All record identifiers accepted by fixture lookup. */
export type PolicyRecordId = keyof typeof POLICY_RECORDS;
