/**
 * Entity id derivation.
 *
 * Lives here because **two backends must derive byte-identical ids**. During
 * RFC 0004's parallel phase both serve the same tenants, and consent
 * idempotency is keyed on a deterministic id: if the two implementations
 * disagreed by so much as an alphabet character or an epoch offset, the same
 * submission would land twice and a visitor would have duplicate consent
 * records. That is not a bug a test in one package would catch.
 *
 * Every constant below is therefore load-bearing and must not be "tidied".
 */

import baseX from 'base-x';

import { hashSha256Hex } from './policy-fingerprint';

/** Table name to id prefix. Prefixes are part of the id format. */
const PREFIXES = {
	auditLog: 'log',
	consent: 'cns',
	consentPolicy: 'pol',
	consentPurpose: 'pur',
	domain: 'dom',
	runtimePolicyDecision: 'rpd',
	subject: 'sub',
} as const;

export type EntityKind = keyof typeof PREFIXES;

// Base58 without the ambiguous glyphs (0, O, I, l), so an id can be read
// aloud or transcribed without loss.
// The fixed alphabet is valid; construction only allocates codec-local state.
// Policy-only consumers can discard it along with the unused ID functions.
// oxlint-disable-next-line no-inline-comments -- Bundlers require this annotation at the call.
const b58 = /* @__PURE__ */ baseX(
	'123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
);

const EPOCH_TIMESTAMP = 1_700_000_000_000;
const ID_BYTE_LENGTH = 20;
const TIMESTAMP_BYTE_LENGTH = 8;

/**
 * Writes the timestamp as an offset from the epoch, big-endian.
 *
 * Leading with time makes ids sort chronologically, which keeps inserts at the
 * right-hand edge of a B-tree index rather than scattered through it.
 *
 * Pre-epoch and non-finite timestamps clamp to zero. They therefore share a
 * zero prefix and are not chronologically ordered relative to each other — the
 * hash bytes still keep them distinct. This clamp is **not** optional
 * defensiveness: `givenAt` can be backdated, consent records predating the
 * epoch exist, and dropping it would derive a different id for every one of
 * them. Two backends disagreeing there means duplicated consent.
 */
const writeTimestamp = function writeTimestamp(
	buf: Uint8Array,
	timestamp: number
): void {
	const rawOffset = timestamp - EPOCH_TIMESTAMP;
	const offset = Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : 0;

	const view = new DataView(buf.buffer);
	view.setUint32(0, Math.floor(offset / 2 ** 32), false);
	view.setUint32(4, offset % 2 ** 32, false);
};

/**
 * Derives an id that is a pure function of the identity that produced it.
 *
 * The same identity always yields the same id, which is what lets a write be
 * idempotent without a read-then-write race: the database's primary key does
 * the deduplication.
 */
export const generateDeterministicId = async function generateDeterministicId(
	kind: EntityKind,
	timestamp: number,
	identity: readonly (string | null)[]
): Promise<string> {
	const digest = await hashSha256Hex(JSON.stringify(identity));
	const buf = new Uint8Array(ID_BYTE_LENGTH);

	writeTimestamp(buf, timestamp);

	for (let i = TIMESTAMP_BYTE_LENGTH; i < ID_BYTE_LENGTH; i += 1) {
		const offset = (i - TIMESTAMP_BYTE_LENGTH) * 2;
		buf[i] = Number.parseInt(digest.slice(offset, offset + 2), 16);
	}

	return `${PREFIXES[kind]}_${b58.encode(buf)}`;
};

/** The fields that identify a single consent submission. */
export interface ConsentSubmissionIdentity {
	readonly tenantId?: string;
	readonly subjectId: string;
	readonly domainId: string;
	readonly policyId?: string | null;
	readonly givenAt: Date;
}

/**
 * Derives a consent's primary key from the submission that produced it.
 *
 * Field order is part of the format — the identity is JSON-serialised before
 * hashing, so reordering these changes every id that would ever be derived.
 */
export const buildConsentId = function buildConsentId(
	input: ConsentSubmissionIdentity
): Promise<string> {
	return generateDeterministicId('consent', input.givenAt.getTime(), [
		input.tenantId ?? null,
		input.subjectId,
		input.domainId,
		input.policyId ?? null,
		input.givenAt.toISOString(),
	]);
};

/**
 * A fresh, time-ordered id for a record that is not deduplicated.
 *
 * Audit entries use this rather than a deterministic id on purpose: two
 * identical changes at different moments are two events and both belong in the
 * trail. Deduplicating them would lose history, which is the one thing an
 * audit log exists to keep.
 *
 * Same layout as the deterministic form — timestamp prefix then random bytes —
 * so ids remain chronologically sortable and visually consistent.
 */
export const generateEntityId = function generateEntityId(
	kind: EntityKind,
	now = Date.now()
): string {
	const buf = new Uint8Array(ID_BYTE_LENGTH);
	writeTimestamp(buf, now);
	crypto.getRandomValues(buf.subarray(TIMESTAMP_BYTE_LENGTH));
	return `${PREFIXES[kind]}_${b58.encode(buf)}`;
};
