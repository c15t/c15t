/**
 * Turns a `POST /subjects` body into a consent submission.
 *
 * The body is the documented wire (`postSubjectInputSchema`): the shape the
 * shipped 2.x backend accepted and the shape every c15t client transport
 * sends. Nothing here invents fields the client did not send.
 *
 * ## What is validated where
 *
 * - Structure: the shared valibot schema. A body it rejects is a 400 with the
 *   field errors, never a guess at what was meant.
 * - Time: `givenAt` and every receipt's `confirmedAt` must be safe,
 *   non-negative epoch milliseconds no later than the server's clock at
 *   request time. Nothing is clamped or rewritten: a receipt records when the
 *   subject acted, and a server that moves it changes the evidence. A clock
 *   ahead of the server's is therefore a rejection the client can see, not a
 *   silent edit.
 * - Decision: a `policySnapshotToken` is verified when present; asserted
 *   manifest-mode inputs are recomputed through the same resolver `/init`
 *   uses; a disagreement is a 422, not a record written against the wrong
 *   policy. Recording without either only happens when there is no policy to
 *   attest to.
 * - Scope: a receipt granting a category the resolved policy does not offer
 *   is refused. A denial outside scope is kept, because a persistent refusal
 *   must remain possible there.
 *
 * ## Receipts and preferences
 *
 * `preferences` is the complete effective map an old backend reads, and it is
 * still what fills `purposeIds` (2.x parity: granted codes only). `choice`
 * carries only the categories this act confirmed, each with its own
 * confirmation time and policy basis, and is stored as sent. The two must
 * agree where they overlap.
 */

import {
	buildConsentManifestFromConfig,
	checkJurisdiction,
	getRegionFromHeaders,
	headersToRecord,
	POLICY_OPTIONAL_CATEGORIES,
	postSubjectInputSchema,
	resolveInitFromManifest,
	subjectCookieBannerInputSchema,
} from '@c15t/schema';
import type {
	ConsentManifest,
	ConsentManifestConfig,
	ConsentManifestPolicyPack,
	PolicyOptionalCategory,
	PostSubjectInput,
	ResolvedPolicyRule,
	SubjectChoiceWire,
} from '@c15t/schema';
import { getIpAddress } from '@c15t/schema/geo';
import type { IpAddressConfig } from '@c15t/schema/geo';
import { baseTranslations } from '@c15t/translations/all';
import { Effect } from 'effect';
import * as v from 'valibot';

import type { DecisionInput } from '../repository/runtime-policy-decision';
import {
	BadRequestError,
	PolicySnapshotError,
	StalePolicyError,
} from './errors';
import { verifyPolicySnapshotToken } from './policy-snapshot';
import type { PolicySnapshotOptions } from './policy-snapshot';

/** The largest epoch millisecond value `Date` can represent. */
const MAX_DATE_MS = 8_640_000_000_000_000;

/** The cookie-banner variant, which is the one that carries receipts. */
type CookieBannerInput = v.InferOutput<typeof subjectCookieBannerInputSchema>;

/**
 * The cookie-banner view of a parsed body, or `undefined` for other types.
 *
 * Re-parsed rather than narrowed on `type`: the legal-document variant
 * accepts suffixed type strings, so `type` alone does not discriminate the
 * union for the compiler.
 */
const asCookieBanner = (
	input: PostSubjectInput
): CookieBannerInput | undefined => {
	if (input.type !== 'cookie_banner') {
		return undefined;
	}
	const parsed = v.safeParse(subjectCookieBannerInputSchema, input);
	return parsed.success ? parsed.output : undefined;
};

export interface SubmissionContext {
	readonly headers: Headers;
	readonly manifest: ConsentManifestConfig | undefined;
	readonly policySnapshot: PolicySnapshotOptions | undefined;
	readonly tenantId: string | undefined;
	readonly ipAddress: IpAddressConfig | undefined;
	/** Whether the request authenticated with an API key. */
	readonly authenticated: boolean;
	/** Server clock, epoch milliseconds. Receipts may not be later than this. */
	readonly now: number;
}

/** The resolved decision behind a submission, when there is one. */
export interface ResolvedDecision {
	readonly input: DecisionInput;
	readonly source: 'snapshot_token' | 'write_time_fallback';
	/** Canonical rule authenticated by the snapshot or asserted resolution. */
	readonly rule: ResolvedPolicyRule;
	readonly jurisdiction: string;
	readonly language: string | undefined;
}

/** Everything the repository needs, derived from a validated body. */
export interface PreparedSubmission {
	readonly input: PostSubjectInput;
	readonly givenAt: Date;
	readonly choice: SubjectChoiceWire | undefined;
	/** Granted codes after scope filtering, for `purposeIds`. */
	readonly grantedCodes: readonly string[];
	/** The preference map after scope filtering, echoed to the client. */
	readonly appliedPreferences: Record<string, boolean> | undefined;
	readonly decision: ResolvedDecision | undefined;
	readonly consentAction: string | undefined;
	readonly validUntil: Date | undefined;
	readonly jurisdiction: string;
	readonly jurisdictionModel: string | undefined;
	readonly ipAddress: string | null;
	readonly userAgent: string | null;
	readonly metadata: Record<string, unknown> | undefined;
}

const OPTIONAL: ReadonlySet<string> = new Set(POLICY_OPTIONAL_CATEGORIES);

const isSafeEpochMs = (value: unknown): value is number =>
	typeof value === 'number' &&
	Number.isSafeInteger(value) &&
	value >= 0 &&
	value <= MAX_DATE_MS;

/** A timestamp the server can accept as a moment that has already happened. */
const checkTimestamp = (
	value: unknown,
	field: string,
	now: number
): BadRequestError | undefined => {
	if (!isSafeEpochMs(value)) {
		return new BadRequestError({
			code: 'INPUT_VALIDATION_FAILED',
			message: `${field} must be a safe non-negative epoch millisecond integer`,
		});
	}
	if (value > now) {
		return new BadRequestError({
			code: 'INPUT_VALIDATION_FAILED',
			message: `${field} is later than the server clock; receipts are recorded as sent, never adjusted`,
		});
	}
	return undefined;
};

const describeIssues = (issues: readonly v.BaseIssue<unknown>[]): string =>
	issues
		.slice(0, 5)
		.map((issue) => {
			const path = issue.path?.map((segment) => String(segment.key)).join('.');
			return path ? `${path}: ${issue.message}` : issue.message;
		})
		.join('; ');

const parseLanguage = (header: string | null): string | undefined => {
	const first = header?.split(',')[0]?.split(';')[0]?.trim();
	return first ? first.split('-')[0]?.toLowerCase() : undefined;
};

const packById = (
	manifest: ConsentManifest,
	policyId: string
): ConsentManifestPolicyPack | undefined =>
	manifest.policyPacks?.find((pack) => pack.rule.id === policyId);

/** 2.x's dedupe key for a runtime decision, byte for byte. */
const buildDedupeKey = (input: {
	tenantId: string | undefined;
	fingerprint: string;
	matchedBy: string;
	countryCode: string | null;
	regionCode: string | null;
	jurisdiction: string;
	language: string | undefined;
}): string =>
	[
		input.tenantId ?? 'default',
		input.fingerprint,
		input.matchedBy,
		input.countryCode ?? 'none',
		input.regionCode ?? 'none',
		input.jurisdiction,
		input.language ?? 'none',
	].join('|');

const asString = (value: unknown): string | undefined =>
	typeof value === 'string' ? value : undefined;

const asNullableString = (value: unknown): string | null =>
	typeof value === 'string' ? value : null;

/** A decision rebuilt from verified token claims. */
const decisionFromClaims = (
	claims: Record<string, unknown>,
	manifest: ConsentManifest,
	context: SubmissionContext
): ResolvedDecision | undefined => {
	const policyId = asString(claims.policyId);
	const fingerprint = asString(claims.fingerprint);
	const matchedBy = asString(claims.matchedBy);
	const jurisdiction = asString(claims.jurisdiction);
	const model = asString(claims.model);
	if (!policyId || !fingerprint || !matchedBy || !jurisdiction || !model) {
		return undefined;
	}
	const pack = packById(manifest, policyId);
	if (
		!pack ||
		pack.fingerprints.policy !== fingerprint ||
		pack.rule.model !== model ||
		manifest.policyFailure
	) {
		return undefined;
	}
	const { rule } = pack;
	const countryCode = asNullableString(claims.country);
	const regionCode = asNullableString(claims.region);
	const language = asString(claims.language);
	return {
		input: {
			categories: rule.scope,
			countryCode,
			dedupeKey: buildDedupeKey({
				countryCode,
				fingerprint,
				jurisdiction,
				language,
				matchedBy,
				regionCode,
				tenantId: context.tenantId,
			}),
			fingerprint,
			jurisdiction,
			language,
			matchedBy,
			model,
			policyI18n: rule.i18n,
			policyId,
			preselectedCategories: rule.preselectedCategories,
			proofConfig: rule.proof,
			regionCode,
		},
		jurisdiction,
		language,
		rule,
		source: 'snapshot_token',
	};
};

/**
 * Recomputes the decision from asserted manifest-mode inputs.
 *
 * Runs the same resolver `/init` runs, so what the client saw and what the
 * server records can only agree by construction, never by coincidence.
 */
const decisionFromAssertedInputs = (
	input: CookieBannerInput,
	manifest: ConsentManifest,
	context: SubmissionContext
): ResolvedDecision | StalePolicyError => {
	const resolved = resolveInitFromManifest(
		manifest,
		{
			country: input.country ?? null,
			gpc: input.gpc,
			language: input.language ?? 'en',
			region: input.region ?? null,
		},
		{ baseTranslations }
	);
	const decision = resolved.policyResolution;
	if (
		decision.status !== 'matched' ||
		decision.policyId !== input.policyId ||
		decision.fingerprints.policy !== input.fingerprint
	) {
		return new StalePolicyError({
			message:
				'The asserted policy decision does not match what the current manifest resolves for these inputs',
			reason: 'decision-mismatch',
		});
	}
	const language = input.language ? parseLanguage(input.language) : undefined;
	const rule = decision.policy;
	return {
		input: {
			categories: rule.scope,
			countryCode: resolved.location.countryCode,
			dedupeKey: buildDedupeKey({
				countryCode: resolved.location.countryCode,
				fingerprint: decision.fingerprints.policy,
				jurisdiction: resolved.jurisdiction,
				language,
				matchedBy: decision.matchedBy,
				regionCode: resolved.location.regionCode,
				tenantId: context.tenantId,
			}),
			fingerprint: decision.fingerprints.policy,
			jurisdiction: resolved.jurisdiction,
			language,
			matchedBy: decision.matchedBy,
			model: rule.model,
			policyI18n: rule.i18n,
			policyId: decision.policyId,
			preselectedCategories: rule.preselectedCategories,
			proofConfig: rule.proof,
			regionCode: resolved.location.regionCode,
		},
		jurisdiction: resolved.jurisdiction,
		language,
		rule,
		source: 'write_time_fallback',
	};
};

const hasAssertedInputs = (input: CookieBannerInput): boolean =>
	input.policyId !== undefined ||
	input.fingerprint !== undefined ||
	input.country !== undefined ||
	input.region !== undefined ||
	input.language !== undefined ||
	input.gpc !== undefined;

const resolveDecision = Effect.fn('submission.resolveDecision')(
	function* resolveDecision(
		input: CookieBannerInput | undefined,
		manifest: ConsentManifest,
		context: SubmissionContext
	): Generator<
		Effect.Effect<unknown, PolicySnapshotError | StalePolicyError>,
		ResolvedDecision | undefined
	> {
		if (!input) {
			return undefined;
		}

		if (input.policySnapshotToken !== undefined) {
			const verification = yield* Effect.promise(() =>
				verifyPolicySnapshotToken(
					input.policySnapshotToken,
					context.policySnapshot,
					context.tenantId
				)
			);
			if (!verification.valid) {
				return yield* new PolicySnapshotError({
					code: 'POLICY_SNAPSHOT_INVALID',
					message: 'Policy snapshot token is invalid',
				});
			}
			const decision = decisionFromClaims(
				verification.payload,
				manifest,
				context
			);
			if (!decision) {
				return yield* new PolicySnapshotError({
					code: 'POLICY_SNAPSHOT_INVALID',
					message: 'Policy snapshot token is missing decision claims',
				});
			}
			return decision;
		}

		if (hasAssertedInputs(input)) {
			if (input.policyId === undefined || input.fingerprint === undefined) {
				return yield* new StalePolicyError({
					message:
						'Asserted decision inputs are incomplete: policyId and fingerprint are required to recompute the decision',
					reason: 'incomplete-inputs',
				});
			}
			const decision = decisionFromAssertedInputs(input, manifest, context);
			if (decision instanceof StalePolicyError) {
				return yield* decision;
			}
			return decision;
		}

		const hasPacks = (manifest.policyPacks?.length ?? 0) > 0;
		if (hasPacks && context.policySnapshot?.signingKey) {
			// The server mints tokens for every decision, so a save that carries
			// none is either an old client or a replayed request stripped of its
			// evidence. Neither may be recorded as a decision it never proved.
			return yield* new PolicySnapshotError({
				code: 'POLICY_SNAPSHOT_REQUIRED',
				message: 'Policy snapshot token is required',
			});
		}
		return undefined;
	}
);

/** Category allowlist of the effective policy, or none when unrestricted. */
const allowedCategories = (
	decision: ResolvedDecision | undefined
): ReadonlySet<string> | undefined =>
	decision ? new Set(['necessary', ...decision.rule.scope]) : undefined;

const isStrict = (decision: ResolvedDecision | undefined): boolean =>
	decision?.rule.scopeMode === 'strict';

/** Refuses receipts that grant what the policy does not offer. */
const checkChoice = (
	choice: SubjectChoiceWire,
	preferences: Record<string, boolean>,
	decision: ResolvedDecision | undefined,
	now: number
): BadRequestError | undefined => {
	const allowed = allowedCategories(decision);
	for (const [category, receipt] of Object.entries(choice.categories)) {
		if (!receipt || !OPTIONAL.has(category)) {
			continue;
		}
		const timestampIssue = checkTimestamp(
			receipt.confirmedAt,
			`choice.categories.${category}.confirmedAt`,
			now
		);
		if (timestampIssue) {
			return timestampIssue;
		}
		if (category in preferences && preferences[category] !== receipt.value) {
			return new BadRequestError({
				code: 'CHOICE_PREFERENCE_MISMATCH',
				message: `choice.categories.${category} disagrees with preferences.${category}`,
			});
		}
		if (receipt.value && allowed && !allowed.has(category)) {
			return new BadRequestError({
				code: 'CHOICE_OUT_OF_SCOPE',
				message: `choice.categories.${category} grants a category outside the resolved policy scope`,
			});
		}
	}
	return undefined;
};

const deriveConsentAction = (
	raw: string | undefined,
	model: string | undefined
): string | undefined => {
	if (raw === 'all') {
		return 'accept_all';
	}
	if (raw === 'necessary') {
		return model === 'opt-out' ? 'opt_out' : 'reject_all';
	}
	if (raw === 'custom') {
		return 'custom';
	}
	return undefined;
};

/**
 * Refuses grants the policy does not offer; keeps refusals wherever they are.
 *
 * 2.x rejected any out-of-scope key under a strict scope. That was wrong for
 * a refusal: a client sends the complete map, including `false` for every
 * category the policy does not offer, and a persistent refusal outside the
 * scope must remain possible.
 */
const filterPreferences = (
	preferences: Record<string, boolean>,
	decision: ResolvedDecision | undefined
): { applied: Record<string, boolean> } | BadRequestError => {
	const allowed = allowedCategories(decision);
	if (!isStrict(decision) || !allowed) {
		return { applied: { ...preferences } };
	}
	const disallowed = Object.entries(preferences)
		.filter(([category, granted]) => granted && !allowed.has(category))
		.map(([category]) => category);
	if (disallowed.length > 0) {
		return new BadRequestError({
			code: 'PURPOSE_NOT_ALLOWED',
			message: `Preferences grant categories not allowed by policy: ${disallowed.join(', ')}`,
		});
	}
	return { applied: { ...preferences } };
};

/**
 * Receipts for a save that carried none: the submitted values themselves.
 *
 * A 2.x client sends its explicit map and nothing else. Storing only the
 * granted codes, as the 2.x backend did, would lose every refusal it made.
 * So the values it actually submitted become `legacy-v2` receipts timed at
 * its `givenAt`, one per optional category present in the map, and nothing
 * is added for categories it did not mention.
 */
const legacyReceiptsFromPreferences = (
	preferences: Record<string, boolean>,
	givenAt: Date
): SubjectChoiceWire | undefined => {
	const categories: SubjectChoiceWire['categories'] = {};
	let any = false;
	for (const category of POLICY_OPTIONAL_CATEGORIES) {
		const value = preferences[category];
		if (typeof value !== 'boolean') {
			continue;
		}
		categories[category] = {
			basis: { kind: 'legacy-v2' },
			confirmedAt: givenAt.getTime(),
			value,
		};
		any = true;
	}
	return any ? { categories, version: 3 } : undefined;
};

/** The model the record is filed under: the decision's, else the client's. */
const effectiveModel = (
	decision: ResolvedDecision | undefined,
	claimed: string | undefined
): string | undefined => {
	if (decision?.rule.model) {
		return decision.rule.model;
	}
	return claimed === 'opt-in' || claimed === 'opt-out' || claimed === 'iab'
		? claimed
		: undefined;
};

/** Semantic validity of positive receipts under the canonical rule. */
const choiceValidityMs = (
	decision: ResolvedDecision | undefined
): number | undefined => decision?.rule.validity.choiceMs;

/**
 * What the policy's proof configuration lets the record keep.
 *
 * 2.x defaults: IP (masked) and user agent are stored unless the policy says
 * otherwise; the language only when it asks.
 */
const proofFields = (
	decision: ResolvedDecision | undefined,
	context: SubmissionContext,
	inputMetadata: Record<string, unknown> | undefined
): {
	ipAddress: string | null;
	userAgent: string | null;
	metadata: Record<string, unknown> | undefined;
} => {
	const proof = decision?.rule.proof;
	const language =
		decision?.language ?? parseLanguage(context.headers.get('accept-language'));
	const metadata: Record<string, unknown> = { ...(inputMetadata ?? {}) };
	if ((proof?.storeLanguage ?? false) && language) {
		metadata.policyLanguage = language;
	}
	return {
		ipAddress:
			(proof?.storeIp ?? true)
				? getIpAddress(context.headers, context.ipAddress)
				: null,
		metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
		userAgent:
			(proof?.storeUserAgent ?? true)
				? (context.headers.get('user-agent') ?? null)
				: null,
	};
};

/** Categories a receipt covers, for logging and tests. */
export const receiptCategories = (
	choice: SubjectChoiceWire | undefined
): PolicyOptionalCategory[] =>
	choice
		? (Object.keys(choice.categories).filter((category) =>
				OPTIONAL.has(category)
			) as PolicyOptionalCategory[])
		: [];

interface ResolvedCategories {
	appliedPreferences: Record<string, boolean> | undefined;
	grantedCodes: string[];
	choice: SubjectChoiceWire | undefined;
}

/**
 * The category facts a submission carries: the filtered preference map, the
 * granted codes for `purposeIds`, and the receipts to store, either as sent
 * or derived from the submitted values when the client sent none.
 */
const resolveCategories = (
	preferences: Record<string, boolean> | undefined,
	cookieBanner: CookieBannerInput | undefined,
	decision: ResolvedDecision | undefined,
	givenAt: Date,
	now: number
): ResolvedCategories | BadRequestError => {
	let appliedPreferences: Record<string, boolean> | undefined;
	let grantedCodes: string[] = [];
	if (preferences) {
		const filtered = filterPreferences(preferences, decision);
		if (filtered instanceof BadRequestError) {
			return filtered;
		}
		appliedPreferences = filtered.applied;
		grantedCodes = Object.entries(filtered.applied)
			.filter(([, granted]) => granted)
			.map(([code]) => code);
	}

	let choice = cookieBanner?.choice;
	if (choice) {
		const issue = checkChoice(choice, appliedPreferences ?? {}, decision, now);
		if (issue) {
			return issue;
		}
	} else if (cookieBanner && appliedPreferences) {
		choice = legacyReceiptsFromPreferences(appliedPreferences, givenAt);
	}
	return { appliedPreferences, choice, grantedCodes };
};

/**
 * Validates a body and resolves everything a consent write needs.
 *
 * Fails with a typed error the route maps onto a status; never throws.
 */
export const prepareSubmission = Effect.fn('submission.prepare')(
	function* prepareSubmission(
		body: unknown,
		context: SubmissionContext
	): Generator<
		Effect.Effect<
			unknown,
			BadRequestError | PolicySnapshotError | StalePolicyError
		>,
		PreparedSubmission
	> {
		const parsed = v.safeParse(postSubjectInputSchema, body);
		if (!parsed.success) {
			return yield* new BadRequestError({
				code: 'INPUT_VALIDATION_FAILED',
				message: `Invalid consent submission: ${describeIssues(parsed.issues)}`,
			});
		}
		const input = parsed.output;

		const givenAtIssue = checkTimestamp(input.givenAt, 'givenAt', context.now);
		if (givenAtIssue) {
			return yield* givenAtIssue;
		}
		const givenAt = new Date(input.givenAt);

		const manifest = yield* Effect.promise(() =>
			buildConsentManifestFromConfig(context.manifest ?? {})
		);
		const cookieBanner = asCookieBanner(input);
		const decision = yield* resolveDecision(cookieBanner, manifest, context);

		const headerRecord = headersToRecord(context.headers);
		const { country, region } = getRegionFromHeaders(headerRecord);
		// Same rule the resolver applies: geo disabled means GDPR everywhere.
		const jurisdiction =
			decision?.jurisdiction ??
			(manifest.defaults?.disableGeoLocation
				? 'GDPR'
				: checkJurisdiction(country ?? null, region ?? null));

		const categories = resolveCategories(
			input.preferences,
			cookieBanner,
			decision,
			givenAt,
			context.now
		);
		if (categories instanceof BadRequestError) {
			return yield* categories;
		}
		const { appliedPreferences, grantedCodes, choice } = categories;

		const model = effectiveModel(decision, input.jurisdictionModel);
		const validityMs = choiceValidityMs(decision);
		const proof = proofFields(decision, context, input.metadata);

		return {
			appliedPreferences,
			choice,
			consentAction: deriveConsentAction(input.consentAction, model),
			decision,
			givenAt,
			grantedCodes,
			input,
			ipAddress: proof.ipAddress,
			jurisdiction,
			jurisdictionModel: model,
			metadata: proof.metadata,
			userAgent: proof.userAgent,
			validUntil:
				validityMs === undefined
					? undefined
					: new Date(givenAt.getTime() + validityMs),
		};
	}
);
