/**
 * The full consent submission: subject, decision, consent, audit entry.
 *
 * This is the operation `POST /subjects` performs, and the one place where
 * getting idempotency wrong is expensive. A retried request — a client
 * retrying, a visitor double-clicking, a proxy replaying — must produce **one**
 * of each of these, not four rows across four tables.
 *
 * Each step is individually idempotent rather than the whole thing being
 * wrapped in a lock:
 *
 * - the subject is keyed on a client-supplied id;
 * - the decision is keyed on its `dedupeKey`;
 * - the consent is keyed on a deterministic id derived from the submission;
 * - and the audit entry is written **only when the consent was actually
 *   created**, so a replay does not add a second record of the same act.
 *
 * That last one is the subtle case. The first three deduplicate naturally
 * because they have keys; an audit entry does not, and writing one per request
 * rather than per event would make the trail claim consent was given twice.
 */

import { generateEntityId } from '@c15t/schema';
import type { SubjectChoiceWire } from '@c15t/schema';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import type { SqlError } from 'effect/unstable/sql';

import { currentTenantId } from '../db/tenant';
import type { Tenant } from '../db/tenant';
import { encodeRow, encoder } from '../db/values';
import { record } from './consent';
import type { ConsentPurposeConflictError, ConsentSubmission } from './consent';
import { recordDecision } from './runtime-policy-decision';
import type { DecisionInput } from './runtime-policy-decision';
import type { IdentityAuthority, SubjectTenantConflictError } from './subject';
import { findOrCreate } from './subject';

export interface ConsentSubmissionRequest {
	readonly subjectId: string;
	readonly domainId: string;
	readonly externalId?: string | null;
	readonly identityProvider?: string | null;
	/** Who asserted `externalId` on a fresh subject. Defaults to `browser`. */
	readonly identityAuthority?: IdentityAuthority;
	readonly policyId?: string | null;
	readonly purposeIds: readonly string[];
	/** v3 receipts this act confirmed, only those categories. */
	readonly choice?: SubjectChoiceWire | null;
	readonly givenAt: Date;
	readonly metadata?: unknown;
	readonly ipAddress: string | null;
	readonly userAgent: string | null;
	readonly jurisdiction?: string | null;
	readonly jurisdictionModel?: string | null;
	readonly tcString?: string | null;
	readonly uiSource?: string | null;
	readonly consentAction?: string | null;
	readonly validUntil?: Date | null;
	/** Present when the request resolved a policy; absent for a bare consent. */
	readonly decision?: DecisionInput;
	/** Where the decision came from: a verified token or a recompute. */
	readonly runtimePolicySource?: 'snapshot_token' | 'write_time_fallback';
}

export interface SubmissionResult {
	readonly subjectId: string;
	readonly consentId: string;
	readonly decisionId: string | undefined;
	/** False when this submission had already been recorded. */
	readonly created: boolean;
}

export const submit = Effect.fn('consent.submit')(function* submit(
	request: ConsentSubmissionRequest
): Generator<
	Effect.Effect<
		unknown,
		| SqlError.SqlError
		| SubjectTenantConflictError
		| ConsentPurposeConflictError,
		SqlClient.SqlClient | Tenant
	>,
	SubmissionResult
> {
	const sql = yield* SqlClient.SqlClient;
	// From the scope, never from the request. The reads filter on the scope's
	// tenant, so a write that took its tenant from anywhere else can disagree
	// with them — and did: the route never passed one, so every row was
	// written with a NULL tenant that the instance's own reads then could not
	// see. Deriving it here is what makes the two halves the same value by
	// construction rather than by the caller remembering.
	const tenantId = yield* currentTenantId;

	const subject = yield* findOrCreate({
		externalId: request.externalId,
		identityAuthority: request.identityAuthority,
		identityProvider: request.identityProvider,
		subjectId: request.subjectId,
		tenantId,
	});

	// `recordDecision` takes its own tenant from the scope and namespaces the
	// dedupe key with it, so there is nothing to inject here.
	const decision = request.decision
		? yield* recordDecision(request.decision)
		: undefined;

	const submission: ConsentSubmission = {
		choice: request.choice,
		consentAction: request.consentAction,
		domainId: request.domainId,
		givenAt: request.givenAt,
		ipAddress: request.ipAddress,
		jurisdiction: request.jurisdiction,
		jurisdictionModel: request.jurisdictionModel,
		metadata: request.metadata,
		policyId: request.policyId,
		purposeIds: request.purposeIds,
		runtimePolicySource: decision ? request.runtimePolicySource : undefined,
		subjectId: subject.id,
		tcString: request.tcString,
		tenantId,
		uiSource: request.uiSource,
		userAgent: request.userAgent,
		validUntil: request.validUntil,
	};

	const consent = yield* record(submission);

	if (consent.created) {
		// Only on a genuine first write. An audit entry per *request* rather
		// than per *event* would make the trail assert the subject consented
		// twice, which is precisely the claim the trail exists to get right.
		yield* sql`
			insert into ${sql('auditLog')} ${sql.insert(
				encodeRow(yield* encoder, {
					actionType: 'consent_given',
					changes: JSON.stringify({
						choice: request.choice ?? null,
						purposeIds: request.purposeIds,
					}),
					createdAt: new Date(),
					entityId: consent.id,
					entityType: 'consent',
					id: generateEntityId('auditLog'),
					ipAddress: request.ipAddress,
					metadata: JSON.stringify({
						decisionId: decision?.id ?? null,
						domainId: request.domainId,
						policyId: request.policyId ?? null,
					}),
					subjectId: subject.id,
					tenantId: tenantId ?? null,
					userAgent: request.userAgent,
				})
			)}
		`;
	}

	// Link the consent to the decision that justified it. Done after the
	// insert rather than as part of it so the consent's deterministic id stays
	// a function of the submission alone — folding a decision id into it would
	// make an otherwise identical resubmission look like a different consent.
	if (decision && consent.created) {
		yield* sql`
			update ${sql('consent')}
			set ${sql('runtimePolicyDecisionId')} = ${decision.id}
			where ${sql('id')} = ${consent.id}
		`;
	}

	return {
		consentId: consent.id,
		created: consent.created,
		decisionId: decision?.id,
		subjectId: subject.id,
	};
});
