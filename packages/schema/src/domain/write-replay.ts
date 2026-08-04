import * as v from 'valibot';

/** Persisted consumption of a single-use consent-write credential. */
export const writeReplaySchema = v.object({
	id: v.string(),
	tenantId: v.nullish(v.string()),
	audience: v.string(),
	tokenId: v.string(),
	requestFingerprint: v.string(),
	expiresAt: v.date(),
	createdAt: v.optional(v.date(), () => new Date()),
});

export type WriteReplay = v.InferOutput<typeof writeReplaySchema>;
